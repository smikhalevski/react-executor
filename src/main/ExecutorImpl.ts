import { AbortablePromise, Awaitable, Deferred, PubSub } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';
import type { Executor, ExecutorEvent, ExecutorTask } from './types';

/**
 * The {@link Executor} implementation returned by the {@link ExecutorManager}.
 *
 * @internal
 */
export class ExecutorImpl<Value = any> implements Executor {
  isFulfilled = false;
  isRejected = false;
  isStale = false;
  value: Value | undefined = undefined;
  reason: any = undefined;
  latestTask: ExecutorTask<Value> | null = null;
  promise = new Deferred<Value>();
  timestamp = 0;

  /**
   * The promise of the pending task execution, or `null` if there's no pending task execution.
   */
  _taskPromise: AbortablePromise<Value> | null = null;

  /**
   * The number of active consumers.
   */
  _consumerCount = 0;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  _pubSub = new PubSub<ExecutorEvent>();

  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  get isActive() {
    return this._consumerCount !== 0;
  }

  get isPending() {
    return this._taskPromise !== null;
  }

  constructor(
    public readonly key: string,
    public readonly manager: ExecutorManager
  ) {}

  get(): Value {
    if (this.isFulfilled) {
      return this.value!;
    }
    if (this.isRejected) {
      throw this.reason;
    }
    throw new Error('Executor is not settled');
  }

  getOrDefault(defaultValue: Value): Value {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  execute(task: ExecutorTask<Value>): AbortablePromise<Value> {
    const taskPromise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this._taskPromise === taskPromise) {
          this._taskPromise = null;

          if (this.isFulfilled) {
            this.promise.resolve(this.value!);
          }
          if (this.isRejected) {
            this.promise.reject(this.reason);
          }
        }
        this._pubSub.publish({ type: 'aborted', target: this });
      });

      new Promise<Value>(resolve => {
        resolve(task(signal, this));
      }).then(
        value => {
          if (!signal.aborted) {
            this._resolve(value, Date.now(), false);
            resolve(value);
          }
        },
        reason => {
          if (!signal.aborted) {
            this._reject(reason, Date.now(), false);
            reject(reason);
          }
        }
      );
    });

    const prevTaskPromise = this._taskPromise;

    this._taskPromise = taskPromise;

    if (prevTaskPromise !== null) {
      prevTaskPromise.abort();
    } else if (this.isSettled) {
      this.promise = new Deferred();
    }

    this.latestTask = task;

    this._pubSub.publish({ type: 'pending', target: this });

    return taskPromise;
  }

  retry(): this {
    if (this.latestTask !== null && !this.isPending) {
      this.execute(this.latestTask);
    }
    return this;
  }

  clear(): this {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = this.isStale = false;
      this.value = this.reason = undefined;
      this._pubSub.publish({ type: 'cleared', target: this });
    }
    return this;
  }

  abort(reason?: unknown): this {
    if (this._taskPromise !== null) {
      this._taskPromise.abort(reason);
    }
    return this;
  }

  invalidate(): this {
    if (this.isStale !== (this.isStale = this.isSettled)) {
      this._pubSub.publish({ type: 'invalidated', target: this });
    }
    return this;
  }

  resolve(value: Awaitable<Value>, timestamp = Date.now()): this {
    this._resolve(value, timestamp, true);
    return this;
  }

  reject(reason: any, timestamp = Date.now()): this {
    this._reject(reason, timestamp, true);
    return this;
  }

  activate(): () => void {
    let isActive = true;

    if (this._consumerCount++ === 0) {
      this._pubSub.publish({ type: 'activated', target: this });
    }

    return () => {
      if (isActive) {
        isActive = false;

        if (--this._consumerCount === 0) {
          this._pubSub.publish({ type: 'deactivated', target: this });
        }
      }
    };
  }

  subscribe(listener: (event: ExecutorEvent) => void): () => void {
    return this._pubSub.subscribe(listener);
  }

  _resolve(value: Awaitable<Value>, timestamp: number, isOrphan: boolean): void {
    if (value !== null && typeof value === 'object' && 'then' in value) {
      this.execute(() => value);
      return;
    }

    const taskPromise = this._taskPromise;
    this._taskPromise = null;

    if (isOrphan) {
      taskPromise?.abort();
      this.promise = new Deferred();
    }

    this.isFulfilled = true;
    this.isRejected = this.isStale = false;
    this.value = value;
    this.reason = undefined;
    this.timestamp = timestamp;

    this.promise.resolve(value);

    this._pubSub.publish({ type: 'fulfilled', target: this });
  }

  _reject(reason: any, timestamp: number, isOrphan: boolean): void {
    const taskPromise = this._taskPromise;
    this._taskPromise = null;

    if (isOrphan) {
      taskPromise?.abort();
      this.promise = new Deferred();
    }

    this.isFulfilled = this.isStale = false;
    this.isRejected = true;
    this.value = undefined;
    this.reason = reason;
    this.timestamp = timestamp;

    this.promise.reject(reason);

    this._pubSub.publish({ type: 'rejected', target: this });
  }
}

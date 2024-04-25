import { AbortablePromise, PubSub } from 'parallel-universe';
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
  timestamp = 0;

  /**
   * The promise of the pending task execution, or `null` if there's no pending task execution.
   */
  _promise: AbortablePromise<Value> | null = null;

  /**
   * The number times the executor was activated.
   */
  _activeCount = 0;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  _pubSub = new PubSub<ExecutorEvent>();

  get isSettled(): boolean {
    return this.isFulfilled || this.isRejected;
  }

  get isActive(): boolean {
    return this._activeCount !== 0;
  }

  get isPending(): boolean {
    return this._promise !== null;
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
    throw new Error('The executor is not settled');
  }

  getOrDefault(defaultValue: Value): Value {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  then<Result1 = Value, Result2 = never>(
    onFulfilled?: ((value: Value) => PromiseLike<Result1> | Result1) | null,
    onRejected?: ((reason: any) => PromiseLike<Result2> | Result2) | null
  ): Promise<Result1 | Result2> {
    return new Promise<Value>((resolve, reject) => {
      if (this.isSettled && !this.isPending) {
        resolve(this.get());
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'disposed') {
          unsubscribe();
          reject(new DOMException('The executor was disposed', 'AbortError'));
          return;
        }

        if (this.isSettled && !this.isPending) {
          unsubscribe();
          try {
            resolve(this.get());
          } catch (error) {
            reject(error);
          }
        }
      });
    }).then(onFulfilled, onRejected);
  }

  execute(task: ExecutorTask<Value>): AbortablePromise<Value> {
    const promise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this._promise === promise) {
          this._promise = null;
        }
        this._pubSub.publish({ type: 'aborted', target: this });
      });

      new Promise<Value>(resolve => {
        const value = task(signal, this);
        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (signal.aborted) {
            return;
          }
          this._promise = null;
          this.resolve(value);
          resolve(value);
        },

        reason => {
          if (signal.aborted) {
            return;
          }
          this._promise = null;
          this.reject(reason);
          reject(reason);
        }
      );
    });

    const prevPromise = this._promise;
    this._promise = promise;

    if (prevPromise !== null) {
      prevPromise.abort();
    }

    if (this._promise === promise) {
      this.latestTask = task;
      this._pubSub.publish({ type: 'pending', target: this });
    }

    return promise;
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
    if (this._promise !== null) {
      this._promise.abort(reason);
    }
    return this;
  }

  invalidate(): this {
    if (this.isStale !== (this.isStale = this.isSettled)) {
      this._pubSub.publish({ type: 'invalidated', target: this });
    }
    return this;
  }

  resolve(value: PromiseLike<Value> | Value, timestamp = Date.now()): this {
    if (value !== null && typeof value === 'object' && 'then' in value) {
      this.execute(() => value);
      return this;
    }

    const promise = this._promise;
    this._promise = null;

    if (promise !== null) {
      promise.abort();
    }

    this.isFulfilled = true;
    this.isRejected = this.isStale = false;
    this.value = value;
    this.reason = undefined;
    this.timestamp = timestamp;

    this._pubSub.publish({ type: 'fulfilled', target: this });

    return this;
  }

  reject(reason: any, timestamp = Date.now()): this {
    const promise = this._promise;
    this._promise = null;

    if (promise !== null) {
      promise.abort();
    }

    this.isFulfilled = this.isStale = false;
    this.isRejected = true;
    this.value = undefined;
    this.reason = reason;
    this.timestamp = timestamp;

    this._pubSub.publish({ type: 'rejected', target: this });

    return this;
  }

  activate(): () => void {
    let isActive = true;

    if (this._activeCount++ === 0) {
      this._pubSub.publish({ type: 'activated', target: this });
    }

    return () => {
      if (isActive) {
        isActive = false;

        if (--this._activeCount === 0) {
          this._pubSub.publish({ type: 'deactivated', target: this });
        }
      }
    };
  }

  subscribe(listener: (event: ExecutorEvent) => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}

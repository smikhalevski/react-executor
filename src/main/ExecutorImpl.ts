import { AbortablePromise, Awaitable, PubSub } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';
import type { ExecutorEvent, Executor, ExecutorTask } from './types';
import { isEqual, isPromiseLike } from './utils';

/**
 * The {@link Executor} implementation returned by the {@link ExecutorManager}.
 *
 * @internal
 */
export class ExecutorImpl<Value = any> implements Executor {
  isFulfilled = false;
  isRejected = false;
  isInvalidated = false;
  value: Value | undefined = undefined;
  reason: any = undefined;
  latestTask: ExecutorTask<Value> | null = null;

  /**
   * The number of times the executor was {@link activate activated}.
   */
  activationCount = 0;

  /**
   * The promise of the pending task execution, or `null` if there's no pending task execution.
   */
  pendingPromise: AbortablePromise<Value> | null = null;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  readonly pubSub = new PubSub<ExecutorEvent>();

  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  get isActive() {
    return this.activationCount !== 0;
  }

  get isPending() {
    return this.pendingPromise !== null;
  }

  constructor(
    public readonly key: string,
    public readonly manager: ExecutorManager
  ) {}

  await(): AbortablePromise<Value> {
    return new AbortablePromise((resolve, reject, signal) => {
      if (!this.isPending) {
        if (this.isFulfilled) {
          resolve(this.value!);
          return;
        }
        if (this.isRejected) {
          reject(this.reason);
          return;
        }
      }

      const unsubscribe = this.pubSub.subscribe(event => {
        if ((event.type === 'fulfilled' || event.type === 'rejected') && !this.isPending) {
          if (this.isFulfilled) {
            resolve(this.value!);
            unsubscribe();
          }
          if (this.isRejected) {
            reject(this.reason);
            unsubscribe();
          }
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  }

  awaitValue(): AbortablePromise<Value> {
    return new AbortablePromise((resolve, _reject, signal) => {
      if (this.isFulfilled && !this.isPending) {
        resolve(this.value!);
        return;
      }

      const unsubscribe = this.pubSub.subscribe(event => {
        if (event.type === 'fulfilled' && !this.isPending) {
          resolve(this.value!);
          unsubscribe();
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  }

  getValue(): Value {
    if (this.isFulfilled) {
      return this.value!;
    }
    if (this.isRejected) {
      throw this.reason;
    }
    throw new Error('Executor is not settled');
  }

  getValueOrDefault(defaultValue: Value): Value {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  execute(task: ExecutorTask<Value>): AbortablePromise<Value> {
    this.latestTask = task;

    if (this.pendingPromise !== null) {
      this.pendingPromise.abort();
    }

    const pendingPromise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this.pendingPromise === pendingPromise) {
          this.pendingPromise = null;
          this.pubSub.publish({ type: 'aborted', target: this });
        }
      });

      new Promise<Value>(resolve => {
        const value = task(signal, this);

        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (this.pendingPromise === pendingPromise) {
            this.pendingPromise = null;
            this.resolve(value);
          }
          resolve(value);
        },
        reason => {
          if (this.pendingPromise === pendingPromise) {
            this.pendingPromise = null;
            this.reject(reason);
          }
          reject(reason);
        }
      );
    });

    this.pendingPromise = pendingPromise;

    this.pubSub.publish({ type: 'pending', target: this });

    return pendingPromise;
  }

  retry(): this {
    if (this.latestTask !== null && !this.isPending) {
      this.execute(this.latestTask);
    }
    return this;
  }

  clear(): this {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = this.isInvalidated = false;
      this.value = this.reason = undefined;
      this.pubSub.publish({ type: 'cleared', target: this });
    }
    return this;
  }

  abort(reason?: unknown): this {
    if (this.pendingPromise !== null) {
      this.pendingPromise.abort(reason);
    }
    return this;
  }

  invalidate(): this {
    if (this.isInvalidated !== (this.isInvalidated = this.isSettled)) {
      this.pubSub.publish({ type: 'invalidated', target: this });
    }
    return this;
  }

  resolve(value: Awaitable<Value>): this {
    const pendingPromise = this.pendingPromise;

    if (isPromiseLike(value)) {
      this.execute(() => value);
      return this;
    }
    if (
      (pendingPromise !== null && ((this.pendingPromise = null), pendingPromise.abort(), true)) ||
      this.isInvalidated ||
      !this.isFulfilled ||
      !isEqual(this.value, value)
    ) {
      this.isFulfilled = true;
      this.isRejected = this.isInvalidated = false;
      this.value = value;
      this.reason = undefined;
      this.pubSub.publish({ type: 'fulfilled', target: this });
    }
    return this;
  }

  reject(reason: any): this {
    const pendingPromise = this.pendingPromise;

    if (
      (pendingPromise !== null && ((this.pendingPromise = null), pendingPromise.abort(), true)) ||
      this.isInvalidated ||
      !this.isRejected ||
      !isEqual(this.reason, reason)
    ) {
      this.isFulfilled = this.isInvalidated = false;
      this.isRejected = true;
      this.value = undefined;
      this.reason = reason;
      this.pubSub.publish({ type: 'rejected', target: this });
    }
    return this;
  }

  activate(): () => void {
    let isActive = true;

    if (this.activationCount++ === 0) {
      this.pubSub.publish({ type: 'activated', target: this });
    }

    return () => {
      if (isActive) {
        isActive = false;

        if (--this.activationCount === 0) {
          this.pubSub.publish({ type: 'deactivated', target: this });
        }
      }
    };
  }

  subscribe(listener: (event: ExecutorEvent) => void): () => void {
    return this.pubSub.subscribe(listener);
  }
}

import { AbortablePromise, Awaitable, PubSub } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';
import type { Event, Executor, Task } from './types';
import { isEqual, isPromiseLike } from './utils';

/**
 * The default {@link Executor} implementation returned by the {@link ExecutorManager}.
 *
 * @internal
 */
export class ExecutorImpl<Value = any> implements Executor {
  isFulfilled = false;
  isRejected = false;
  isInvalidated = false;
  value: Value | undefined;
  reason: any;

  /**
   * The last task passed to {@link execute}, or `null` if executor wasn't settled through {@link execute}.
   */
  task: Task<Value> | null = null;

  /**
   * The promise of the pending task execution, or `null` if there's no pending task execution.
   */
  promise: AbortablePromise<Value> | null = null;

  /**
   * Number of times {@link activate} was called for this executor.
   */
  activationCount = 0;

  pubSub = new PubSub<Event>();

  get isActive() {
    return this.activationCount !== 0;
  }

  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  get isPending() {
    return this.promise !== null;
  }

  constructor(
    public readonly key: string,
    public readonly manager: ExecutorManager
  ) {}

  getOrWait(): AbortablePromise<Value> {
    return new AbortablePromise((resolve, _reject, signal) => {
      if (this.isFulfilled) {
        resolve(this.value!);
        return;
      }

      const unsubscribe = this.pubSub.subscribe(event => {
        if (event.type === 'fulfilled') {
          resolve(this.value!);
          unsubscribe();
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  }

  getOrThrow(): Value {
    if (this.isFulfilled) {
      return this.value!;
    }
    if (this.isRejected) {
      throw this.reason;
    }
    throw new DOMException('Executor is not settled', 'InvalidStateError');
  }

  getOrDefault(defaultValue: Value): Value {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  execute(task: Task<Value>): AbortablePromise<Value> {
    this.task = task;

    const promise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this.promise === promise) {
          this.promise = null;
          this.pubSub.publish({ type: 'aborted', target: this });
        }
      });

      new Promise<Value>(resolve => {
        const value = task(signal, this.value);

        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (this.promise === promise) {
            this.promise = null;
            this.resolve(value);
          }
          resolve(value);
        },
        reason => {
          if (this.promise === promise) {
            this.promise = null;
            this.reject(reason);
          }
          reject(reason);
        }
      );
    });

    const prevPromise = this.promise;
    this.promise = promise;

    if (prevPromise !== null) {
      prevPromise.abort();
    }

    this.pubSub.publish({ type: 'pending', target: this });

    return promise;
  }

  retry(): AbortablePromise<Value> {
    if (this.promise !== null) {
      return this.promise;
    }
    if (this.task !== null) {
      return this.execute(this.task);
    }
    return new AbortablePromise<Value>((_resolve, reject) => {
      reject(new DOMException('Executor has no task to retry', 'InvalidStateError'));
    });
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
    if (this.promise !== null) {
      this.promise.abort(reason);
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
    const promise = this.promise;

    if (isPromiseLike(value)) {
      this.execute(() => value);
      return this;
    }
    if (
      (promise !== null && ((this.promise = null), promise.abort(), true)) ||
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
    const promise = this.promise;

    if (
      (promise !== null && ((this.promise = null), promise.abort(), true)) ||
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

  subscribe(listener: (event: Event) => void): () => void {
    return this.pubSub.subscribe(listener);
  }
}

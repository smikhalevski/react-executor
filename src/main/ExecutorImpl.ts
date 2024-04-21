import { AbortableCallback, AbortablePromise, Awaitable, PubSub } from 'parallel-universe';
import type { ExecutorEvent } from './Executor';
import { isEqual, isPromiseLike } from './utils';

/**
 * Manages async callback execution process and provides ways to access execution results, abort or replace an
 * execution, and subscribe to its state changes.
 *
 * @template T The value stored by the executor.
 * @hidden
 */
export class ExecutorImpl<T = any> {
  /**
   * `true` if the result was fulfilled with a value, or `false` otherwise.
   */
  isFulfilled = false;

  /**
   * `true` if the result was rejected with a reason, or `false` otherwise.
   */
  isRejected = false;

  /**
   * `true` if {@link invalidate} was called on a {@link isSettled settled} executor and a new settlement hasn't
   * occurred yet.
   */
  isInvalidated = false;

  /**
   * The value or `undefined` if executor isn't {@link isFulfilled fulfilled}.
   */
  value: T | undefined;

  /**
   * The reason of failure or `undefined` if executor isn't {@link isRejected rejected}.
   */
  reason: any;

  /**
   * `true` if result was fulfilled or rejected, or `false` otherwise.
   */
  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  /**
   * `true` if an execution is currently pending, or `false` otherwise.
   */
  get isPending() {
    return this._pendingPromise !== null;
  }

  _pubSub = new PubSub<ExecutorEvent>();

  /**
   * The last callback passed to {@link execute}, or `null` if executor wasn't settled through {@link execute}.
   */
  _lastCallback: AbortableCallback<T> | null = null;

  /**
   * The promise of the pending execution, or `null` if there's no pending execution.
   */
  _pendingPromise: AbortablePromise<T> | null = null;

  /**
   * Executes a callback and populates the executor with the returned result.
   *
   * Instantly aborts pending execution (if any), marks executor as pending and then invokes the callback.
   *
   * If other execution was started before the promise returned by the callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * @param callback The callback that returns the new result for the executor to store.
   * @returns The promise that is resolved with the result of the callback execution.
   */
  execute(callback: AbortableCallback<T>): AbortablePromise<T> {
    this._lastCallback = callback;

    const pendingPromise = new AbortablePromise<T>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this._pendingPromise === pendingPromise) {
          this._pendingPromise = null;
          this._pubSub.publish({ type: 'aborted', target: this });
        }
      });

      new Promise<T>(resolve => {
        const value = callback(signal);

        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (this._pendingPromise === pendingPromise) {
            this._pendingPromise = null;
            this.resolve(value);
          }
          resolve(value);
        },
        reason => {
          if (this._pendingPromise === pendingPromise) {
            this._pendingPromise = null;
            this.reject(reason);
          }
          reject(reason);
        }
      );
    });

    const prevPendingPromise = this._pendingPromise;

    this._pendingPromise = pendingPromise;

    if (prevPendingPromise !== null) {
      prevPendingPromise.abort();
    }

    this._pubSub.publish({ type: 'pending', target: this });

    return pendingPromise;
  }

  /**
   * Executes the last callback executed by this executor, or returns the promise of the pending execution.
   *
   * If there's no callback to retry then the returned promise is rejected with an {@link Error}.
   *
   * @see {@link invalidate}
   */
  retry(): AbortablePromise<T> {
    if (this._pendingPromise !== null) {
      return this._pendingPromise;
    }
    if (this._lastCallback !== null) {
      return this.execute(this._lastCallback);
    }
    return new AbortablePromise<T>((_resolve, reject) => {
      reject(new Error("Executor doesn't have a callback to retry"));
    });
  }

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}, or the default value otherwise.
   *
   * @param defaultValue The default value.
   */
  getOrDefault(defaultValue: T): T {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  /**
   * Clears available results and doesn't affect the pending execution. Executor can still be {@link retry retried}
   * after being cleared.
   */
  clear(): this {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = this.isInvalidated = false;
      this.value = this.reason = undefined;
      this._pubSub.publish({ type: 'cleared', target: this });
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and preserves available results as is. Value (or error) returned from pending
   * callback is ignored. The signal passed to the executed callback is aborted.
   *
   * @param reason The abort reason passed to the pending promise.
   */
  abort(reason?: unknown): this {
    if (this._pendingPromise !== null) {
      this._pendingPromise.abort(reason);
    }
    return this;
  }

  /**
   * If the executor is settled then its value is marked as {@link isInvalidated invalidated}.
   *
   * @see {@link retry}
   */
  invalidate(): this {
    if (this.isInvalidated !== (this.isInvalidated = this.isSettled)) {
      this._pubSub.publish({ type: 'invalidated', target: this });
    }
    return this;
  }

  /**
   * Aborts pending execution and fulfills the executor with the given value.
   *
   * If value is a promise-like then {@link execute} is implicitly called.
   *
   * @param value The value to resolve the executor with.
   */
  resolve(value: Awaitable<T>): this {
    const pendingPromise = this._pendingPromise;

    if (isPromiseLike(value)) {
      this.execute(() => value);
      return this;
    }
    if (
      (pendingPromise !== null && ((this._pendingPromise = null), pendingPromise.abort(), true)) ||
      this.isInvalidated ||
      !this.isFulfilled ||
      !isEqual(this.value, value)
    ) {
      this.isFulfilled = true;
      this.isRejected = this.isInvalidated = false;
      this.value = value;
      this.reason = undefined;
      this._pubSub.publish({ type: 'fulfilled', target: this });
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and rejects with the reason.
   */
  reject(reason: any): this {
    const pendingPromise = this._pendingPromise;

    if (
      (pendingPromise !== null && ((this._pendingPromise = null), pendingPromise.abort(), true)) ||
      this.isInvalidated ||
      !this.isRejected ||
      !isEqual(this.reason, reason)
    ) {
      this.isFulfilled = this.isInvalidated = false;
      this.isRejected = true;
      this.value = undefined;
      this.reason = reason;
      this._pubSub.publish({ type: 'rejected', target: this });
    }
    return this;
  }

  /**
   * Subscribes a listener to the events published by this executor.
   *
   * @param listener The listener to subscribe.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (event: ExecutorEvent<T>) => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}

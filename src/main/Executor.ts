import { AbortableCallback, AbortablePromise, Awaitable } from 'parallel-universe';

export interface ExecutorEvent<T = any> {
  type: 'aborted' | 'pending' | 'cleared' | 'invalidated' | 'fulfilled' | 'rejected';
  target: Executor<T>;
}

export interface Executor<T = any> {
  /**
   * `true` if the result was fulfilled with a value, or `false` otherwise.
   */
  readonly isFulfilled: boolean;

  /**
   * `true` if the result was rejected with a reason, or `false` otherwise.
   */
  readonly isRejected: boolean;

  /**
   * `true` if {@link invalidate} was called on a {@link isSettled settled} executor and a new settlement hasn't
   * occurred yet.
   */
  readonly isInvalidated: boolean;

  /**
   * The value or `undefined` if executor isn't {@link isFulfilled fulfilled}.
   */
  readonly value: T | undefined;

  /**
   * The reason of failure or `undefined` if executor isn't {@link isRejected rejected}.
   */
  readonly reason: any;

  /**
   * `true` if result was fulfilled or rejected, or `false` otherwise.
   */
  readonly isSettled: boolean;

  /**
   * `true` if an execution is currently pending, or `false` otherwise.
   */
  readonly isPending: boolean;

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
  execute(callback: AbortableCallback<T>): AbortablePromise<T>;

  /**
   * Executes the last callback executed by this executor, or returns the promise of the pending execution.
   *
   * If there's no callback to retry then the returned promise is rejected with an {@link Error}.
   *
   * @see {@link invalidate}
   */
  retry(): AbortablePromise<T>;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}, or the default value otherwise.
   *
   * @param defaultValue The default value.
   */
  getOrDefault(defaultValue: T): T;

  /**
   * Clears available results and doesn't affect the pending execution. Executor can still be {@link retry retried}
   * after being cleared.
   */
  clear(): this;

  /**
   * Instantly aborts pending execution and preserves available results as is. Value (or error) returned from pending
   * callback is ignored. The signal passed to the executed callback is aborted.
   *
   * @param reason The abort reason passed to the pending promise.
   */
  abort(reason?: unknown): this;

  /**
   * If the executor is settled then its value is marked as {@link isInvalidated invalidated}.
   *
   * @see {@link retry}
   */
  invalidate(): this;

  /**
   * Aborts pending execution and fulfills the executor with the given value.
   *
   * If value is a promise-like then {@link execute} is implicitly called.
   *
   * @param value The value to resolve the executor with.
   */
  resolve(value: Awaitable<T>): this;

  /**
   * Instantly aborts pending execution and rejects with the reason.
   */
  reject(reason: any): this;

  /**
   * Subscribes a listener to the events published by this executor.
   *
   * @param listener The listener to subscribe.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (event: ExecutorEvent<T>) => void): () => void;
}

import type { AbortablePromise, Awaitable } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';

/**
 * The event published by the {@link Executor}.
 *
 * @template Value The value stored by the executor.
 */
export interface Event<Value = any> {
  /**
   * The type of the event.
   */
  type:
    | 'created'
    | 'pending'
    | 'fulfilled'
    | 'rejected'
    | 'aborted'
    | 'cleared'
    | 'invalidated'
    | 'activated'
    | 'deactivated'
    | 'disposed';

  /**
   * The executor that published the event.
   */
  target: Executor<Value>;
}

export type Plugin<Value = any> = (executor: Executor<Value>) => (() => void | undefined) | void | undefined;

/**
 * The task executed by {@link Executor}.
 *
 * @param signal The {@link AbortSignal} that is aborted if task was discarded.
 * @param prevValue The value that the executor was fulfilled with when the task was called.
 * @returns The value that the executor must be fulfilled with.
 * @template Value The value stored by the executor.
 */
export type Task<Value = any> = (signal: AbortSignal, prevValue: Value | undefined) => Awaitable<Value>;

/**
 * Manages the async task execution process and provides ways to access task execution results, abort or replace the
 * task execution, and subscribe to its state changes.
 *
 * @template Value The value stored by the executor.
 */
export interface Executor<Value = any> {
  /**
   * The unique key of this executor.
   */
  readonly key: string;

  /**
   * The manager that created this executor.
   */
  readonly manager: ExecutorManager;

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
   * `true` if this executor was marked as active at least once.
   *
   * @see {@link activate}
   */
  readonly isActive: boolean;

  /**
   * The value or `undefined` if executor isn't {@link isFulfilled fulfilled}.
   */
  readonly value: Value | undefined;

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
   * Gets the available value of a non-pending executor or waits for the executor to be fulfilled.
   *
   * The returned promise is never rejected unless aborted.
   */
  getOrWait(): AbortablePromise<Value>;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}, or throws a {@link reason} otherwise.
   *
   * @throws InvalidStateError If the executor isn't {@link isSettled settled}.
   */
  getOrThrow(): Value;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}, or the default value otherwise.
   *
   * @param defaultValue The default value.
   */
  getOrDefault(defaultValue: Value): Value;

  /**
   * Executes a task and populates the executor with the returned result.
   *
   * Instantly aborts pending execution (if any), marks executor as pending and then invokes the task callback.
   *
   * If other execution was started before the promise returned by the task callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * @param task The task callback that returns the new result for the executor to store.
   * @returns The promise that is resolved with the result of the task.
   */
  execute(task: Task<Value>): AbortablePromise<Value>;

  /**
   * Executes the last task callback executed by this executor, or returns the promise of the pending execution.
   *
   * @throws InvalidStateError If there's no task to retry.
   * @see {@link invalidate}
   */
  retry(): AbortablePromise<Value>;

  /**
   * Clears available results and doesn't affect the pending execution. Executor can still be {@link retry retried}
   * after being cleared.
   */
  clear(): this;

  /**
   * Instantly aborts pending execution and preserves available results as is. Value (or error) returned from pending
   * task callback is ignored. The signal passed to the executed task callback is aborted.
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
  resolve(value: Awaitable<Value>): this;

  /**
   * Instantly aborts pending execution and rejects with the reason.
   */
  reject(reason: any): this;

  /**
   * Marks the executor as being actively monitored by an external subscriber.
   *
   * Activated executor stays {@link isActive active} until all deactivate callbacks are invoked.
   *
   * @returns The callback that deactivates the executor.
   */
  activate(): () => void;

  /**
   * Subscribes a listener to the events published by this executor.
   *
   * @param listener The listener to subscribe.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (event: Event<Value>) => void): () => void;
}

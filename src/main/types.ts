import type { AbortablePromise } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager.js';

/**
 * The type of the event.
 *
 * See {@link ExecutorEvent} for more details.
 */
export type ExecutorEventType =
  | 'attached'
  | 'detached'
  | 'activated'
  | 'deactivated'
  | 'pending'
  | 'fulfilled'
  | 'rejected'
  | 'aborted'
  | 'cleared'
  | 'invalidated'
  | 'annotated'
  | 'plugin_configured'
  | (string & {});

/**
 * The event published by the {@link Executor}.
 *
 * Lifecycle events:
 *
 * <dl>
 *   <dt><i>"attached"</i></dt>
 *   <dd>The executor was just created, plugins were applied to it, and it was attached to the manager.</dd>
 *
 *   <dt><i>"detached"</i></dt>
 *   <dd>
 *   The executor was just {@link ExecutorManager.detach detached}: it was removed from the manager and all of its
 *   subscribers were unsubscribed.
 *   </dd>
 *
 *   <dt><i>"activated"</i></dt>
 *   <dd>
 *   The executor was inactive and became {@link Executor.isActive active}. This means that there are consumers that
 *   observe the state of the executor.
 *   </dd>
 *
 *   <dt><i>"deactivated"</i></dt>
 *   <dd>
 *   The executor was {@link Executor.isActive active} and became inactive. This means that there are no consumers
 *   that observe the state of the executor.
 *   </dd>
 *
 *   <dt><i>"pending"</i></dt>
 *   <dd>The executor started an {@link Executor.task} execution.</dd>
 *
 *   <dt><i>"fulfilled"</i></dt>
 *   <dd>The executor was {@link Executor.isFulfilled fulfilled} with a {@link Executor.value value}.</dd>
 *
 *   <dt><i>"rejected"</i></dt>
 *   <dd>The executor was {@link Executor.isRejected rejected} with a {@link Executor.reason reason}.</dd>
 *
 *   <dt><i>"aborted"</i></dt>
 *   <dd>
 *   The {@link Executor.task latest task} was aborted.
 *
 *   If executor is still {@link Executor.isPending pending} when abort event is published then the currently pending
 *   task is being replaced with a new task.
 *
 *   Calling {@link Executor.execute} when handling an abort event may lead to stack overflow. If you need to
 *   do this anyway, execute a new task from async context using
 *   [`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask) or similar API.
 *   </dd>
 *
 *   <dt><i>"cleared"</i></dt>
 *   <dd>The executor was cleared and now isn't {@link Executor.isSettled settled}.</dd>
 *
 *   <dt><i>"invalidated"</i></dt>
 *   <dd>The result stored in the executor was {@link Executor.invalidate invalidated}.</dd>
 *
 *   <dt><i>"annotated"</i></dt>
 *   <dd>{@link Executor.annotations Annotations} associated with the executor were patched.</dd>
 *
 *   <dt><i>"plugin_configured"</i></dt>
 *   <dd>The configuration of the plugin associated with the executor was updated.</dd>
 * </dl>
 *
 * @template Value The value stored by the executor.
 */
export interface ExecutorEvent<Value = any> {
  /**
   * The type of the event.
   *
   * See {@link ExecutorEvent} for more details.
   */
  type: ExecutorEventType;

  /**
   * The executor for which the lifecycle event has occurred.
   */
  target: Executor<Value>;

  /**
   * The {@link Executor.version version of the executor} for which this event was published.
   */
  version: number;

  /**
   * The payload carried by the event, or `undefined` if there's no payload.
   */
  payload: any;
}

/**
 * The details of an event that can be published by an executor.
 */
export interface PartialExecutorEvent {
  /**
   * The type of the event.
   *
   * See {@link ExecutorEvent} for more details.
   */
  type: ExecutorEventType;

  /**
   * The payload carried by the event.
   */
  payload?: any;
}

/**
 * The plugin callback that is invoked when the executor is created by the {@link ExecutorManager}.
 *
 * @param executor The executor that was just created.
 * @template Value The value stored by the executor.
 */
export type ExecutorPlugin<Value = any> = (executor: Executor<Value>) => void;

/**
 * The task that can be executed by an {@link Executor}.
 *
 * @param signal The {@link AbortSignal} that is aborted if task was discarded.
 * @param executor The executor that executes the task.
 * @returns The value that the executor must be fulfilled with.
 * @template Value The value stored by the executor.
 */
export type ExecutorTask<Value = any> = (signal: AbortSignal, executor: Executor<Value>) => PromiseLike<Value> | Value;

/**
 * The minimal serializable state that is required to hydrate the {@link Executor} instance.
 *
 * @template Value The value stored by the executor.
 */
export interface ExecutorState<Value = any> {
  /**
   * The value of the latest fulfillment.
   */
  readonly value: Value | undefined;

  /**
   * The reason of the latest failure.
   */
  readonly reason: any;

  /**
   * The map of annotations associated with the executor.
   */
  readonly annotations: Record<PropertyKey, any>;

  /**
   * The timestamp when the executor was settled, or 0 if it isn't settled.
   */
  readonly settledAt: number;

  /**
   * The timestamp when the executor was invalidated, or 0 if the executor isn't invalidated.
   */
  readonly invalidatedAt: number;

  /**
   * `true` if the executor was fulfilled with a {@link value}, or `false` otherwise.
   */
  readonly isFulfilled: boolean;
}

/**
 * Provides access to execution results and allows subscribing to execution state changes.
 *
 * @template Value The value stored by the executor.
 */
export interface ReadonlyExecutor<Value = any> extends ExecutorState<Value>, Observable<ExecutorEvent<Value>> {
  /**
   * The key of this executor, unique in scope of the {@link manager}.
   */
  readonly key: any;

  /**
   * The value of the latest fulfillment.
   *
   * **Note:** An executor may still have a value even if it was {@link isRejected rejected}. Use {@link get},
   * {@link getOrDefault}, or {@link getOrAwait} to retrieve the value of a {@link Executor.isFulfilled fulfilled}
   * executor.
   */
  readonly value: Value | undefined;

  /**
   * The reason of the latest failure.
   *
   * **Note:** An executor may still have a rejection reason even if it was {@link Executor.isFulfilled fulfilled}.
   * Check {@link isRejected} to ensure that an executor is actually rejected.
   */
  readonly reason: any;

  /**
   * The integer version of {@link ExecutorState the state of this executor} that is incremented every time the executor
   * is mutated.
   */
  readonly version: number;

  /**
   * The manager that created the executor.
   */
  readonly manager: ExecutorManager;

  /**
   * `true` if the executor was rejected with a {@link reason}, or `false` otherwise.
   */
  readonly isRejected: boolean;

  /**
   * `true` if the executor is {@link isFulfilled fulfilled} or {@link isRejected rejected}, or `false` otherwise.
   */
  readonly isSettled: boolean;

  /**
   * `true` if the executor was {@link Executor.activate activated} more times than deactivated.
   */
  readonly isActive: boolean;

  /**
   * `true` if the execution is currently pending, or `false` otherwise.
   */
  readonly isPending: boolean;

  /**
   * `true` if {@link Executor.invalidate invalidate} was called on a {@link isSettled settled} executor and
   * a new settlement hasn't occurred yet.
   */
  readonly isInvalidated: boolean;

  /**
   * The latest task that was {@link Executor.execute executed}, or `null` if the executor hasn't executed any tasks.
   */
  readonly task: ExecutorTask<Value> | null;

  /**
   * The promise of the pending {@link task} execution, or `null` if there's no pending task execution.
   *
   * **Note:** This promise is aborted if
   * [the task is replaced](https://megastack.dev/react-executor#replace-a-task).
   * Use {@link getOrAwait} to wait until the executor becomes {@link isSettled settled}.
   */
  readonly promise: AbortablePromise<Value> | null;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}. Throws a {@link reason} if the executor
   * is {@link isRejected rejected}. Otherwise, throws an {@link !Error}.
   */
  get(): Value;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}. Otherwise, returns `undefined`.
   */
  getOrDefault(): Value | undefined;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}. Otherwise, returns the default value.
   *
   * @param defaultValue The default value.
   * @template DefaultValue The type of the default value.
   */
  getOrDefault<DefaultValue>(defaultValue: DefaultValue): Value | DefaultValue;

  /**
   * Waits for the executor to become {@link isSettled settled} and non-{@link isPending pending}. The returned
   * promise is then resolved with a {@link value} if the executor is {@link isFulfilled fulfilled}, or rejected
   * with a {@link reason} if the executor is {@link isRejected rejected}.
   *
   * If the executor is detached during this operation, the returned promise is rejected with an
   * {@link !DOMException AbortError}.
   */
  getOrAwait(): AbortablePromise<Value>;

  /**
   * Captures the snapshot of the current executor state.
   */
  getStateSnapshot(): ExecutorState<Value>;
}

/**
 * Manages the async task execution process and provides ways to access execution results, abort or replace a task
 * execution, and subscribe to execution state changes.
 *
 * @template Value The value stored by the executor.
 */
export interface Executor<Value = any> extends ReadonlyExecutor<Value> {
  /**
   * The latest task that was {@link execute executed}, or `null` if the executor hasn't executed any tasks.
   *
   * **Note:** Unlike {@link ReadonlyExecutor.task}, this property is writable to allow plugins and advanced
   * use cases to replace the stored task reference directly.
   */
  task: ExecutorTask<Value> | null;

  /**
   * Executes a task and populates the executor with the returned result.
   *
   * Instantly aborts pending execution (if any), marks the executor as {@link isPending pending} and then invokes the
   * task callback.
   *
   * If a new task is executed before the returned promise is fulfilled then the signal is aborted and the result is
   * ignored.
   *
   * @param task The task callback that returns the new result for the executor to store.
   * @returns The promise that is resolved with the result of the task.
   */
  execute(task: ExecutorTask<Value>): AbortablePromise<Value>;

  /**
   * If the executor is not {@link isPending pending}, the {@link task latest task} is {@link execute executed}
   * again. If there's no task then this is a no-op.
   */
  retry(): void;

  /**
   * Clears available results and doesn't affect the pending task execution.
   *
   * The {@link task latest task} can still be {@link retry retried} after the executor is cleared.
   */
  clear(): void;

  /**
   * Instantly aborts pending execution and preserves available results as-is. The value (or error) returned from
   * the pending task callback is ignored, and the signal passed to the task callback is aborted.
   *
   * **Note:** This method only affects the pending task promise, not the executor's settled state. To also
   * clear or reject the executor's value, call {@link clear} or {@link reject} afterwards.
   *
   * @param reason The abort reason used to reject the pending task promise.
   */
  abort(reason?: unknown): void;

  /**
   * If the executor is settled, marks the result as {@link isInvalidated invalidated}.
   *
   * @param invalidatedAt The timestamp to record as the invalidation time. Defaults to `Date.now()`.
   */
  invalidate(invalidatedAt?: number): void;

  /**
   * Aborts pending execution and fulfills the executor with the value.
   *
   * **Note:** If the value is a {@link PromiseLike}, it is wrapped internally and the {@link task} is updated to
   * reflect the pending resolution. This differs from passing a plain value, where settlement is immediate.
   *
   * @param value The value.
   * @param settledAt The timestamp when the value was acquired. Ignored if value is a `PromiseLike`.
   */
  resolve(value: PromiseLike<Value> | Value, settledAt?: number): void;

  /**
   * Instantly aborts pending execution and rejects the executor with the reason.
   *
   * @param reason The reason of failure.
   * @param settledAt The timestamp when the reason was acquired. Defaults to `Date.now()`.
   */
  reject(reason: any, settledAt?: number): void;

  /**
   * Marks the executor as being actively monitored by an external consumer.
   *
   * An activated executor stays {@link isActive active} until all returned deactivate callbacks are invoked.
   *
   * @returns The callback that deactivates the executor if there are no more active consumers.
   */
  activate(): () => void;

  /**
   * Publishes the event to subscribers of the executor and its manager.
   *
   * @param event The event to publish.
   */
  publish(event: PartialExecutorEvent): void;

  /**
   * Merges the patch into the {@link annotations existing annotations}.
   *
   * @param patch The patch containing new annotations.
   */
  annotate(patch: Record<PropertyKey, any>): void;
}

/**
 * The observable that allows subscribing to a stream of values.
 *
 * @template T The value pushed by the observable.
 */
export interface Observable<T> {
  /**
   * Subscribes the listener to changes of the observed value.
   *
   * @param listener The listener to subscribe.
   */
  subscribe(listener: (value: T) => void): () => void;
}

/**
 * {@link https://www.typescriptlang.org/docs/handbook/utility-types.html#noinfertype NoInfer} polyfill.
 *
 * @internal
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];

/**
 * Payload of the {@link ExecutorEvent plugin_configured} event.
 *
 * @internal
 */
export interface PluginConfiguredPayload {
  /**
   * The type of the plugin that was configured.
   *
   * @example "abortDeactivated"
   */
  type: string;

  /**
   * The options that the plugin now uses.
   */
  options?: object;
}

/**
 * Parses and serializes values.
 */
export interface Serializer {
  /**
   * Parses a serialized value.
   *
   * @param text The serialized value.
   */
  parse(text: string): any;

  /**
   * Serializes a value as a string.
   *
   * @param value The value to serialize.
   */
  stringify(value: any): string;
}

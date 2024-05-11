import type { AbortablePromise } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';

/**
 * Annotations that allow to associate arbitrary metadata with the {@link Executor} instance.
 *
 * @see {@link Executor.annotate}
 */
export interface ExecutorAnnotations {
  readonly [annotationKey: PropertyKey]: any;
}

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
  type:
    | 'plugin_configured'
    | 'attached'
    | 'activated'
    | 'annotated'
    | 'pending'
    | 'fulfilled'
    | 'rejected'
    | 'aborted'
    | 'cleared'
    | 'invalidated'
    | 'deactivated'
    | 'detached'
    | (string & {});

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
   * The key of this executor, unique in scope of the {@link Executor.manager}.
   */
  readonly key: any;

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
  readonly annotations: ExecutorAnnotations;

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
 * Manages the async task execution process and provides ways to access execution results, abort or replace a task
 * execution, and subscribe to an execution state changes.
 *
 * @template Value The value stored by the executor.
 */
export interface Executor<Value = any> extends ExecutorState<Value> {
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
   * `true` if the executor was {@link activate activated} more times then deactivated.
   */
  readonly isActive: boolean;

  /**
   * `true` if the execution is currently pending, or `false` otherwise.
   */
  readonly isPending: boolean;

  /**
   * `true` if {@link invalidate} was called on a {@link isSettled settled} executor and a new settlement hasn't
   * occurred yet.
   */
  readonly isInvalidated: boolean;

  /**
   * The latest task that was {@link execute executed}, or `null` if the executor didn't execute any tasks.
   */
  readonly task: ExecutorTask<Value> | null;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}. Otherwise, throws the {@link reason} if
   * the executor is {@link isRejected rejected}, or an {@link Error} if the executor isn't settled.
   */
  get(): Value;

  /**
   * Returns a {@link value} if the executor is {@link isFulfilled fulfilled}, or the default value.
   *
   * @param defaultValue The default value.
   */
  getOrDefault(defaultValue: Value): Value;

  /**
   * For a non-{@link isPending pending} and {@link isSettled settled} executor, the promise is resolved with the
   * available {@link value}, or rejected with the available {@link reason}. Otherwise, the promise waits for the
   * executor to become settled and then settles as well.
   */
  toPromise(): AbortablePromise<Value>;

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
   * If the executor isn't {@link isPending pending} then the {@link task latest task} is {@link execute executed}
   * again. If there's no task then no-op.
   */
  retry(): void;

  /**
   * Clears available results and doesn't affect the pending task execution.
   *
   * The {@link task latest task} can still be {@link retry retried} after the executor is cleared.
   */
  clear(): void;

  /**
   * Instantly aborts pending execution and preserves available results as is. Value (or error) returned from pending
   * task callback is ignored. The signal passed to the executed task callback is aborted.
   *
   * @param reason The abort reason that is used for rejection of the pending task promise.
   */
  abort(reason?: unknown): void;

  /**
   * If the executor is settled the result is masted as {@link isInvalidated invalidated}.
   *
   * @param invalidatedAt The timestamp when the executor result was invalidated.
   */
  invalidate(invalidatedAt?: number): void;

  /**
   * Aborts pending execution and fulfills the executor with the value.
   *
   * **Note:** If value is a promise-like then {@link execute} is implicitly called which replaces the {@link task}.
   *
   * @param value The value.
   * @param settledAt The timestamp when the value was acquired. If value is a promise then the timestamp is ignored.
   */
  resolve(value: PromiseLike<Value> | Value, settledAt?: number): void;

  /**
   * Instantly aborts pending execution and rejects the executor with the reason.
   *
   * @param reason The reason of failure.
   * @param settledAt The timestamp when the reason was acquired.
   */
  reject(reason: any, settledAt?: number): void;

  /**
   * Marks the executor as being actively monitored by an external consumer.
   *
   * Activated executor stays {@link isActive active} until all returned deactivate callbacks are invoked.
   *
   * @returns The callback that deactivates the executor if there are no more active consumers.
   */
  activate(): () => void;

  /**
   * Subscribes a listener to events published by the executor.
   *
   * @param listener The listener to subscribe.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (event: ExecutorEvent<Value>) => void): () => void;

  /**
   * Publishes the event for subscribers of the executor and its manager.
   *
   * @param eventType The type of the published event.
   * @param payload The optional payload associated with the event.
   * @templace Payload The payload published with the event.
   */
  publish<Payload>(eventType: ExecutorEvent['type'], payload?: Payload): void;

  /**
   * Assigns patch to {@link annotations existing annotations}.
   *
   * @param patch The patch containing new annotations.
   */
  annotate(patch: ExecutorAnnotations): void;

  /**
   * Returns the serializable executor state.
   */
  toJSON(): ExecutorState<Value>;
}

/**
 * Payload of the {@link ExecutorEvent plugin_configured} event.
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
 * Poor Man's NoInfer polyfill.
 */
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-4-beta/#the-noinfer-utility-type
export type NoInfer<T> = [T][T extends any ? 0 : never];

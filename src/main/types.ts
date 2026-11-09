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
 *   <dd>The executor was created, plugins were applied to it, and it was attached to the manager.</dd>
 *
 *   <dt><i>"detached"</i></dt>
 *   <dd>
 *   The executor was {@link ExecutorManager.detach detached}: it was removed from the manager and all of its
 *   subscribers were unsubscribed.
 *   </dd>
 *
 *   <dt><i>"activated"</i></dt>
 *   <dd>
 *   The executor was inactive and became {@link Executor.isActive active}: a consumer started to observe its state.
 *   </dd>
 *
 *   <dt><i>"deactivated"</i></dt>
 *   <dd>
 *   The executor was {@link Executor.isActive active} and became inactive: the last consumer stopped observing its
 *   state.
 *   </dd>
 *
 *   <dt><i>"pending"</i></dt>
 *   <dd>The executor started to execute a {@link Executor.task task}.</dd>
 *
 *   <dt><i>"fulfilled"</i></dt>
 *   <dd>The executor was {@link Executor.isFulfilled fulfilled} with a {@link Executor.value value}.</dd>
 *
 *   <dt><i>"rejected"</i></dt>
 *   <dd>The executor was {@link Executor.isRejected rejected} with a {@link Executor.reason reason}.</dd>
 *
 *   <dt><i>"aborted"</i></dt>
 *   <dd>
 *   The pending task was aborted. If the executor is still {@link Executor.isPending pending} when this event is
 *   published, the aborted task was replaced with a new one.
 *
 *   Calling {@link Executor.execute} when handling this event may lead to a stack overflow. If you need to do so,
 *   execute the new task asynchronously, for example with
 *   [`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask).
 *   </dd>
 *
 *   <dt><i>"cleared"</i></dt>
 *   <dd>The executor was {@link Executor.clear cleared} and isn't {@link Executor.isSettled settled} anymore.</dd>
 *
 *   <dt><i>"invalidated"</i></dt>
 *   <dd>The executor result was {@link Executor.invalidate invalidated}.</dd>
 *
 *   <dt><i>"annotated"</i></dt>
 *   <dd>The {@link Executor.annotations annotations} of the executor were changed.</dd>
 *
 *   <dt><i>"plugin_configured"</i></dt>
 *   <dd>The configuration of a plugin applied to the executor was changed.</dd>
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
   * The executor that published the event.
   */
  target: Executor<Value>;

  /**
   * The {@link Executor.version version} of the executor state when the event was published.
   */
  version: number;

  /**
   * The payload carried by the event, or `undefined` if there's no payload.
   */
  payload: any;
}

/**
 * The event to publish with {@link Executor.publish}.
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
 * The plugin that is called when the {@link ExecutorManager} creates an executor.
 *
 * @param executor The executor that was just created.
 * @template Value The value stored by the executor.
 */
export type ExecutorPlugin<Value = any> = (executor: Executor<Value>) => void;

/**
 * The callback of a task that is executed by an {@link Executor}.
 *
 * @param signal The signal that is aborted if the task is aborted or replaced.
 * @param executor The executor that executes the task.
 * @returns The value, or a promise of the value, to fulfill the executor with.
 * @template Value The value stored by the executor.
 */
export type ExecutorTaskCallback<Value = any> = (
  signal: AbortSignal,
  executor: Executor<Value>
) => PromiseLike<Value> | Value;

/**
 * The task that can be executed by an {@link Executor}.
 *
 * @template Value The value stored by the executor.
 */
export interface ExecutorTask<Value = any> {
  /**
   * The callback that is called when the task is executed.
   */
  callback: ExecutorTaskCallback<Value>;

  /**
   * The value that the executor is fulfilled with while the {@link callback} is pending. Use it for optimistic
   * updates: the UI shows this value before the task settles.
   *
   * If the task is fulfilled, this value is replaced with the task result. If the task is rejected, the previous
   * state is restored and the executor is rejected with the task error. If the task is aborted or replaced, the
   * previous state is restored.
   *
   * If `undefined`, the executor state doesn't change while the task is pending.
   */
  pendingValue?: Value;

  /**
   * If `true`, executing this task doesn't replace the {@link Executor.task latest task}, so
   * {@link Executor.retry retries} still execute the previous task. Use it for one-off tasks, such as mutations, that
   * must not be retried.
   *
   * @default false
   */
  preserveLatestTask?: boolean;
}

/**
 * The minimal serializable state of an {@link Executor}, which is enough to hydrate or persist it.
 *
 * @template Value The value stored by the executor.
 */
export interface ExecutorState<Value = any> {
  /**
   * The value of the latest fulfillment.
   */
  readonly value: Value | undefined;

  /**
   * The reason of the latest rejection.
   */
  readonly reason: any;

  /**
   * The annotations of the executor.
   */
  readonly annotations: Record<PropertyKey, any>;

  /**
   * The timestamp when the executor was settled, or 0 if it isn't settled.
   */
  readonly settledAt: number;

  /**
   * The timestamp when the executor was invalidated, or 0 if it isn't invalidated.
   */
  readonly invalidatedAt: number;

  /**
   * `true` if the executor was fulfilled with a {@link value}, or `false` otherwise.
   */
  readonly isFulfilled: boolean;
}

/**
 * The read-only view of an executor: provides access to the executor state and allows subscribing to its events.
 *
 * @template Value The value stored by the executor.
 */
export interface ReadonlyExecutor<Value = any> extends ExecutorState<Value>, Observable<ExecutorEvent<Value>> {
  /**
   * The key of the executor, unique within the {@link manager}.
   */
  readonly key: any;

  /**
   * The value of the latest fulfillment.
   *
   * **Note:** A rejected executor may still have a value from an earlier fulfillment. Use {@link get},
   * {@link getOrDefault}, or {@link getOrAwait} to read the value of a {@link isFulfilled fulfilled} executor.
   */
  readonly value: Value | undefined;

  /**
   * The reason of the latest rejection.
   *
   * **Note:** A fulfilled executor may still have a reason from an earlier rejection. Check {@link isRejected} to
   * find out if the executor is rejected.
   */
  readonly reason: any;

  /**
   * The version of the executor state. It is incremented every time the executor changes.
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
   * `true` if the executor has active consumers, or `false` otherwise. See {@link Executor.activate}.
   */
  readonly isActive: boolean;

  /**
   * `true` if a task is pending, or `false` otherwise.
   */
  readonly isPending: boolean;

  /**
   * `true` if the executor result was {@link Executor.invalidate invalidated} and the executor hasn't been settled
   * since, or `false` otherwise.
   */
  readonly isInvalidated: boolean;

  /**
   * The latest task that was {@link Executor.execute executed}, or `null` if the executor hasn't executed any tasks.
   */
  readonly task: ExecutorTask<Value> | null;

  /**
   * The promise of the pending task, or `null` if there's no pending task.
   *
   * **Note:** This promise is rejected if the task is aborted or
   * [replaced](https://megastack.dev/react-executor#replace-a-task). Use {@link getOrAwait} to wait until the executor
   * is {@link isSettled settled}.
   */
  readonly promise: Promise<Value> | null;

  /**
   * Returns the {@link value} if the executor is {@link isFulfilled fulfilled}, throws the {@link reason} if it's
   * {@link isRejected rejected}, or throws an {@link !Error} if it isn't settled.
   */
  get(): Value;

  /**
   * Returns the {@link value} if the executor is {@link isFulfilled fulfilled}, or `undefined` otherwise.
   */
  getOrDefault(): Value | undefined;

  /**
   * Returns the {@link value} if the executor is {@link isFulfilled fulfilled}, or the default value otherwise.
   *
   * @param defaultValue The default value.
   * @template DefaultValue The type of the default value.
   */
  getOrDefault<DefaultValue>(defaultValue: DefaultValue): Value | DefaultValue;

  /**
   * Waits until the executor is {@link isSettled settled} and has no pending task. The returned promise is resolved
   * with the {@link value} if the executor is {@link isFulfilled fulfilled}, or rejected with the {@link reason} if
   * it's {@link isRejected rejected}.
   *
   * If the executor is detached while waiting, the promise is rejected with an {@link !DOMException AbortError}. If
   * the signal is aborted, the promise is rejected with the abort reason.
   *
   * @param options Options with the signal that aborts waiting.
   */
  getOrAwait(options?: AsyncOptions): Promise<Value>;

  /**
   * Returns a snapshot of the executor state.
   */
  getStateSnapshot(): ExecutorState<Value>;
}

/**
 * Executes tasks, stores their results, and publishes events when its state changes.
 *
 * @template Value The value stored by the executor.
 */
export interface Executor<Value = any> extends ReadonlyExecutor<Value> {
  /**
   * The latest task that was {@link execute executed}, or `null` if the executor hasn't executed any tasks.
   *
   * **Note:** Unlike {@link ReadonlyExecutor.task}, this property is writable, so plugins can replace the latest task.
   */
  task: ExecutorTask<Value> | null;

  /**
   * Executes a task and stores its result in the executor.
   *
   * The task callback is called synchronously. If another task is pending, it is aborted and replaced. If this task
   * is aborted or replaced before it settles, the signal passed to the callback is aborted, and the result is ignored.
   *
   * If the signal from options is aborted, the task is aborted, and the returned promise is rejected with the abort
   * reason. If the signal is already aborted, the task isn't executed.
   *
   * @param task The task, or the task callback, to execute.
   * @param options Options with the signal that aborts the task.
   * @returns The promise that is resolved with the result of the task, or rejected if the task fails, is aborted, or
   * is replaced.
   */
  execute(task: ExecutorTask<Value> | ExecutorTaskCallback<Value>, options?: AsyncOptions): Promise<Value>;

  /**
   * Executes the {@link task latest task} again, unless a task is pending or there's no latest task.
   */
  retry(): void;

  /**
   * Clears the value and the reason, so the executor isn't {@link isSettled settled} anymore. A pending task isn't
   * affected, and the {@link task latest task} can still be {@link retry retried}.
   */
  clear(): void;

  /**
   * Aborts the pending task. The signal passed to the task callback is aborted, and the task result is ignored.
   *
   * The executor state is preserved, except that a {@link ExecutorTask.pendingValue pending value} is rolled back.
   * To change the state, call {@link clear} or {@link reject} afterwards.
   *
   * @param reason The reason that rejects the task promise.
   */
  abort(reason?: unknown): void;

  /**
   * Marks the executor result as {@link isInvalidated invalidated}, if the executor is settled.
   *
   * @param invalidatedAt The timestamp of the invalidation. Defaults to `Date.now()`.
   */
  invalidate(invalidatedAt?: number): void;

  /**
   * Aborts the pending task, and fulfills the executor with the value.
   *
   * If the value is a promise, the executor stays pending until the promise settles, and then it is fulfilled or
   * rejected with the promise result. The {@link task latest task} isn't changed.
   *
   * @param value The value, or a promise of the value.
   * @param settledAt The timestamp when the value was acquired. Ignored if the value is a promise. Defaults to
   * `Date.now()`.
   */
  resolve(value: PromiseLike<Value> | Value, settledAt?: number): void;

  /**
   * Aborts the pending task, and rejects the executor with the reason.
   *
   * @param reason The reason of the rejection.
   * @param settledAt The timestamp when the reason was acquired. Defaults to `Date.now()`.
   */
  reject(reason: any, settledAt?: number): void;

  /**
   * Marks the executor as observed by a consumer. The executor stays {@link isActive active} until all consumers
   * are removed.
   *
   * @returns The callback that removes the consumer. The executor is deactivated when its last consumer is removed.
   */
  activate(): () => void;

  /**
   * Publishes the event to subscribers of the executor and its manager.
   *
   * @param event The event to publish.
   */
  publish(event: PartialExecutorEvent): void;

  /**
   * Merges the patch into the {@link annotations}.
   *
   * @param patch The annotations to add or replace.
   */
  annotate(patch: Record<PropertyKey, any>): void;
}

/**
 * The observable that allows subscribing to a stream of values.
 *
 * @template T The value emitted by the observable.
 */
export interface Observable<T> {
  /**
   * Subscribes the listener to values emitted by the observable.
   *
   * @param listener The listener to subscribe.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (value: T) => void): () => void;
}

/**
 * Options of an asynchronous operation.
 *
 * @inline
 */
export interface AsyncOptions {
  /**
   * The signal that aborts the operation.
   */
  signal?: AbortSignal;
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

import { AbortablePromise, PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Executor, ExecutorEvent, ExecutorPlugin, ExecutorState, ExecutorTask, NoInfer } from './types';

/**
 * Options provided to the {@link ExecutorManager} constructor.
 */
export interface ExecutorManagerOptions {
  /**
   * Plugins that are applied to all executors.
   */
  plugins?: Array<ExecutorPlugin | null | undefined>;

  /**
   * Serializes executor keys.
   *
   * The serialized key form can be anything. If you want to use object identities as executor keys, provide an identity
   * function as a serializer to mute the error.
   *
   * @param key The key to serialize.
   * @default JSON.stringify
   */
  keySerializer?: (key: any) => any;

  /**
   * If `true` then executors are registered in the devtools extension.
   *
   * @default true
   */
  devtools?: boolean;
}

/**
 * Creates executors and manages their lifecycle.
 */
export class ExecutorManager implements Iterable<Executor> {
  /**
   * The map from a key to an executor.
   */
  protected readonly _executors = new Map<unknown, ExecutorImpl>();

  /**
   * The pubsub that handles the manager subscriptions.
   */
  protected readonly _pubSub = new PubSub<ExecutorEvent>();

  /**
   * The map from a key to an initial state that must be set to an executor before plugins are applied. Entries from
   * this map are deleted after the executor is initialized.
   */
  protected readonly _initialState = new Map<unknown, ExecutorState>();

  /**
   * Plugins that are applied to all executors.
   */
  protected readonly _plugins: ExecutorPlugin[] = [];

  /**
   * Serializes keys of executors.
   */
  readonly keySerializer: (key: unknown) => unknown;

  /**
   * Creates a new executor manager.
   *
   * @param options Additional options.
   */
  constructor(options: ExecutorManagerOptions = {}) {
    this.keySerializer = options.keySerializer || (value => JSON.stringify(value));

    if (options.devtools === undefined || options.devtools) {
      const devtools = typeof __REACT_EXECUTOR_DEVTOOLS__ !== 'undefined' ? __REACT_EXECUTOR_DEVTOOLS__ : undefined;

      if (devtools !== undefined) {
        this._plugins.push(devtools.plugin);
      }
    }

    if (options.plugins !== undefined) {
      for (const plugin of options.plugins) {
        if (plugin !== null && plugin !== undefined) {
          this._plugins.push(plugin);
        }
      }
    }
  }

  /**
   * Returns an executor by its key, or `undefined` if there's no such executor.
   *
   * @param key The unique executor key.
   */
  get(key: unknown): Executor | undefined {
    return this._executors.get(this.keySerializer(key));
  }

  /**
   * Returns an existing executor or creates a new one.
   *
   * @param key The unique executor key.
   * @param initialValue The initial executor value.
   * @param plugins The array of plugins that are applied to the newly created executor.
   */
  getOrCreate<Value = any>(
    key: unknown,
    initialValue: undefined,
    plugins?: Array<ExecutorPlugin<Value> | null | undefined>
  ): Executor<Value>;

  /**
   * Returns an existing executor or creates a new one.
   *
   * @param key The unique executor key.
   * @param initialValue The initial executor value.
   * @param plugins The array of plugins that are applied to the newly created executor.
   */
  getOrCreate<Value = any>(
    key: unknown,
    initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
    plugins?: Array<ExecutorPlugin<NoInfer<Value>> | null | undefined>
  ): Executor<Value>;

  getOrCreate(key: unknown, initialValue?: unknown, plugins?: Array<ExecutorPlugin | null | undefined>): Executor {
    const serializedKey = this.keySerializer(key);

    let executor = this._executors.get(serializedKey);

    if (executor !== undefined) {
      // Existing executor
      return executor;
    }

    executor = Object.assign(new ExecutorImpl(key, this), this._initialState.get(serializedKey));

    if (typeof initialValue === 'function') {
      executor.task = initialValue as ExecutorTask;
    }

    const unsubscribe = executor.subscribe(event => {
      this._pubSub.publish(event);
    });

    try {
      for (const plugin of this._plugins) {
        plugin(executor);
      }

      if (plugins !== undefined) {
        for (const plugin of plugins) {
          plugin?.(executor);
        }
      }
    } catch (error) {
      unsubscribe();
      throw error;
    }

    this._initialState.delete(serializedKey);
    this._executors.set(serializedKey, executor);

    executor.publish('attached');

    if (initialValue === undefined || executor.isSettled || executor.isPending) {
      return executor;
    }
    if (typeof initialValue === 'function') {
      executor.execute(initialValue as ExecutorTask);
    } else {
      executor.resolve(initialValue);
    }
    return executor;
  }

  /**
   * Resolves with the existing executor or waits for an executor to be created.
   *
   * @param key The executor key to wait for.
   */
  getOrAwait(key: unknown): AbortablePromise<Executor> {
    return new AbortablePromise((resolve, _reject, signal) => {
      const serializedKey = this.keySerializer(key);
      const executor = this._executors.get(serializedKey);

      if (executor !== undefined) {
        resolve(executor);
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'attached' && this.keySerializer(event.target.key) === serializedKey) {
          unsubscribe();
          resolve(event.target);
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  }

  /**
   * Deletes the non-{@link Executor.isActive active} executor from the manager.
   *
   * If the detached executor is {@link Executor.isPending pending} then it _is not_ aborted. Subscribe to the
   * {@link ExecutorEvent detach} event on either manager or an executor and abort it manually.
   *
   * @param key The key of the executor to delete.
   * @returns `true` if the executor was detached, or `false` if there's no such executor, or the executor is active.
   */
  detach(key: unknown): boolean {
    const serializedKey = this.keySerializer(key);
    const executor = this._executors.get(serializedKey);

    if (executor === undefined || executor.isActive) {
      return false;
    }

    this._executors.delete(serializedKey);

    executor.publish('detached');
    executor._pubSub.unsubscribeAll();

    return true;
  }

  /**
   * Subscribes a listener to the events published by all executors that are created by this manager.
   *
   * @param listener The listener to subscribe.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (event: ExecutorEvent) => void): () => void {
    return this._pubSub.subscribe(listener);
  }

  /**
   * Iterates over executors created by the manager.
   */
  [Symbol.iterator](): IterableIterator<Executor> {
    return this._executors.values();
  }

  /**
   * Returns serializable executor manager state.
   */
  toJSON(): ExecutorState[] {
    return Array.from(this).map(executor => executor.toJSON());
  }

  /**
   * Injects the initial state for the executor that is created in the future.
   *
   * @param initialState The initial state of the hydrated executor that can be created via
   * {@link ExecutorManager.getOrCreate}.
   * @returns `true` if the executor was hydrated, or `false` if the executor already exists and cannot be hydrated.
   */
  hydrate(initialState: ExecutorState): boolean {
    const serializedKey = this.keySerializer(initialState.key);

    if (this._executors.has(serializedKey)) {
      return false;
    }
    this._initialState.set(serializedKey, initialState);
    return true;
  }
}

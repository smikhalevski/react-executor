import { ExecutorImpl } from './ExecutorImpl.ts';
import { PubSub } from './PubSub.ts';
import type {
  AsyncOptions,
  Executor,
  ExecutorEvent,
  ExecutorPlugin,
  ExecutorState,
  ExecutorTaskCallback,
  NoInfer,
  Observable,
} from './types.ts';

/**
 * Options provided to the {@link ExecutorManager} constructor.
 */
export interface ExecutorManagerOptions {
  /**
   * Plugins that are applied to all executors.
   */
  plugins?: Array<ExecutorPlugin | null | undefined>;

  /**
   * Returns the ID of an executor key. Keys with the same ID refer to the same executor.
   *
   * To use object identities as executor keys, pass an identity function.
   *
   * @param key The key to get the ID of.
   * @default JSON.stringify
   */
  keyIdGenerator?: (key: any) => any;

  /**
   * If `true`, executors are registered in the React Executor Devtools extension, if it's installed.
   *
   * @default true
   */
  devtools?: boolean;
}

/**
 * Creates executors and manages their lifecycle.
 */
export class ExecutorManager implements Iterable<Executor>, Observable<ExecutorEvent> {
  /**
   * The map from a key to an executor.
   */
  protected readonly _executors = new Map<unknown, ExecutorImpl>();

  /**
   * The pubsub that handles the manager subscriptions.
   */
  protected readonly _pubSub = new PubSub<ExecutorEvent>();

  /**
   * The map from a key ID to an initial state that must be set to an executor before plugins are applied.
   * Entries from this map are deleted after the executor is created.
   */
  protected readonly _initialState = new Map<unknown, ExecutorState>();

  /**
   * Plugins that are applied to all executors.
   */
  protected readonly _plugins: ExecutorPlugin[] = [];

  /**
   * Returns the ID of an executor key. Keys with the same ID refer to the same executor.
   */
  readonly keyIdGenerator: (key: unknown) => unknown;

  /**
   * Creates a new executor manager.
   *
   * @param options Manager options.
   */
  constructor(options: ExecutorManagerOptions = {}) {
    this.keyIdGenerator = options.keyIdGenerator || (value => JSON.stringify(value));

    if (options.devtools === undefined || options.devtools) {
      const devtools = typeof __REACT_EXECUTOR_DEVTOOLS__ !== 'undefined' ? __REACT_EXECUTOR_DEVTOOLS__ : undefined;

      if (devtools !== undefined) {
        this._plugins.push(devtools.plugin);
      }
    }

    if (options.plugins === undefined) {
      return;
    }

    for (const plugin of options.plugins) {
      if (plugin !== null && plugin !== undefined) {
        this._plugins.push(plugin);
      }
    }
  }

  /**
   * Sets the initial state of an executor that hasn't been created yet. The state is applied when the executor is
   * created with {@link ExecutorManager.getOrCreate getOrCreate}.
   *
   * @param key The unique executor key.
   * @param initialState The initial state of the executor.
   * @returns `true` if the initial state was set, or `false` if the executor already exists.
   */
  hydrate(key: unknown, initialState: ExecutorState): boolean {
    const keyId = this.keyIdGenerator(key);

    if (this._executors.has(keyId)) {
      return false;
    }
    this._initialState.set(keyId, initialState);
    return true;
  }

  /**
   * Returns an executor by its key, or `undefined` if there's no such executor.
   *
   * @param key The unique executor key.
   */
  get(key: unknown): Executor | undefined {
    return this._executors.get(this.keyIdGenerator(key));
  }

  /**
   * Returns an existing executor or creates a new one.
   *
   * @param key The unique executor key.
   * @param initialValue The initial value of a new executor: a value, a promise, or a task callback to execute.
   * It isn't applied if plugins have already settled the executor or started a task.
   * @param plugins Plugins that are applied to a new executor.
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
   * @param initialValue The initial value of a new executor: a value, a promise, or a task callback to execute.
   * It isn't applied if plugins have already settled the executor or started a task.
   * @param plugins Plugins that are applied to a new executor.
   */
  getOrCreate<Value = any>(
    key: unknown,
    initialValue?: ExecutorTaskCallback<Value> | PromiseLike<Value> | Value,
    plugins?: Array<ExecutorPlugin<NoInfer<Value>> | null | undefined>
  ): Executor<Value>;

  getOrCreate(key: unknown, initialValue?: unknown, plugins?: Array<ExecutorPlugin | null | undefined>): Executor {
    const keyId = this.keyIdGenerator(key);

    let executor = this._executors.get(keyId);

    if (executor !== undefined) {
      // Existing executor
      return executor;
    }

    executor = Object.assign(new ExecutorImpl(key, this), this._initialState.get(keyId));

    if (typeof initialValue === 'function') {
      executor.task = { callback: initialValue as ExecutorTaskCallback };
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

    this._initialState.delete(keyId);
    this._executors.set(keyId, executor);

    executor.publish({ type: 'attached' });

    if (initialValue === undefined || executor.isSettled || executor.isPending) {
      return executor;
    }
    if (typeof initialValue === 'function') {
      executor.execute(initialValue as ExecutorTaskCallback);
    } else {
      executor.resolve(initialValue);
    }
    return executor;
  }

  /**
   * Resolves with the executor that has the key, and waits for the executor to be created if it doesn't exist yet.
   *
   * If the signal is aborted, the promise is rejected with the abort reason.
   *
   * @param key The unique executor key.
   * @param options Options with the signal that aborts waiting.
   */
  getOrAwait(key: unknown, options: AsyncOptions = {}): Promise<Executor> {
    const { signal } = options;

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }

      const keyId = this.keyIdGenerator(key);
      const executor = this._executors.get(keyId);

      if (executor !== undefined) {
        resolve(executor);
        return;
      }

      const handleAbort = () => {
        unsubscribe();
        reject(signal!.reason);
      };

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'attached' && this.keyIdGenerator(event.target.key) === keyId) {
          unsubscribe();
          signal?.removeEventListener('abort', handleAbort);
          resolve(event.target);
        }
      });

      signal?.addEventListener('abort', handleAbort);
    });
  }

  /**
   * Detaches an executor that isn't {@link Executor.isActive active} from the manager.
   *
   * A pending task of the detached executor isn't aborted. To abort it, subscribe to the
   * {@link ExecutorEvent detached} event.
   *
   * @param key The unique executor key.
   * @returns `true` if the executor was detached, or `false` if there's no such executor or it's active.
   */
  detach(key: unknown): boolean {
    const keyId = this.keyIdGenerator(key);
    const executor = this._executors.get(keyId);

    if (executor === undefined || executor.isActive) {
      return false;
    }

    this._executors.delete(keyId);

    executor.publish({ type: 'detached' });
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
}

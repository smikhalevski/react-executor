import { AbortablePromise, PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Executor, ExecutorEvent, ExecutorPlugin, ExecutorState, ExecutorTask, NoInfer } from './types';

/**
 * Options provided to the {@link ExecutorManager} constructor.
 */
export interface ExecutorManagerOptions {
  /**
   * The initial state of executors that are created via {@link ExecutorManager.getOrCreate}.
   */
  initialState?: ExecutorState[];

  /**
   * Plugins that are applied to all executors.
   */
  plugins?: Array<ExecutorPlugin | null | undefined>;

  /**
   * Serializes executor keys.
   *
   * A serializer is required to support objects as executor keys, otherwise an error is thrown.
   *
   * The serialized key form can be anything. If you want to use object identities as executor keys, provide an identity
   * function as a serializer to mute the error.
   *
   * @param key The key to serialize.
   */
  keySerializer?: (key: any) => any;
}

/**
 * Creates executors and manages their lifecycle.
 */
export class ExecutorManager implements Iterable<Executor> {
  /**
   * The map from a key to an executor.
   */
  private readonly _executors = new Map<unknown, ExecutorImpl>();

  /**
   * The pubsub that handles the manager subscriptions.
   */
  private readonly _pubSub = new PubSub<ExecutorEvent>();

  /**
   * The map from a key to an initial state that must be set to an executor before plugins are applied. Entries from
   * this map are deleted after the executor is initialized.
   */
  private readonly _initialState = new Map<unknown, ExecutorState>();

  /**
   * Plugins that are applied to all executors.
   */
  private readonly _plugins: ExecutorPlugin[] = [];

  /**
   * Serializes executor keys.
   */
  private readonly _keySerializer: ((key: unknown) => unknown) | undefined;

  /**
   * Creates a new executor manager.
   *
   * @param options Additional options.
   */
  constructor(options: ExecutorManagerOptions = {}) {
    this._keySerializer = options.keySerializer;

    if (options.initialState !== undefined) {
      for (const state of options.initialState) {
        this._initialState.set(this._toSerializedKey(state.key), state);
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
    return this._executors.get(this._toSerializedKey(key));
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
    const serializedKey = this._toSerializedKey(key);

    let executor = this._executors.get(serializedKey);

    if (executor !== undefined) {
      return executor;
    }

    executor = Object.assign(new ExecutorImpl(key, this), this._initialState.get(serializedKey));

    this._initialState.delete(serializedKey);

    for (const plugin of this._plugins) {
      plugin(executor);
    }

    if (plugins !== undefined) {
      for (const plugin of plugins) {
        plugin?.(executor);
      }
    }

    executor.subscribe(event => {
      this._pubSub.publish(event);
    });

    this._executors.set(serializedKey, executor);

    executor.publish('configured');

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
  waitFor(key: unknown): AbortablePromise<Executor> {
    return new AbortablePromise((resolve, _reject, signal) => {
      const serializedKey = this._toSerializedKey(key);
      const executor = this._executors.get(serializedKey);

      if (executor !== undefined) {
        resolve(executor);
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'configured' && this._toSerializedKey(event.target.key) === serializedKey) {
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
   * If the disposed executor is {@link Executor.isPending pending} then it _is not_ aborted. Subscribe to the
   * {@link ExecutorEvent.type dispose} event on either manager or an executor and abort it manually.
   *
   * @param key The key of the executor to delete.
   * @returns `true` if the executor was disposed, or `false` if there's no such executor, or the executor is active.
   */
  dispose(key: unknown): boolean {
    const serializedKey = this._toSerializedKey(key);
    const executor = this._executors.get(serializedKey);

    if (executor === undefined || executor.isActive) {
      return false;
    }

    this._executors.delete(serializedKey);

    executor.publish('disposed');
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
   * Converts a key into its serialized form.
   *
   * @param key The key to convert.
   * @returns The serialized key.
   */
  private _toSerializedKey(key: unknown): unknown {
    if (this._keySerializer !== undefined) {
      return this._keySerializer(key);
    }
    if ((key !== null && typeof key === 'object') || typeof key === 'function') {
      throw new Error('Object keys require a keySerializer');
    }
    return key;
  }
}

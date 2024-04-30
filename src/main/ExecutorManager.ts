import { AbortablePromise, PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Executor, ExecutorEvent, ExecutorPlugin, ExecutorState, ExecutorTask } from './types';

/**
 * Creates executors and manages their lifecycle.
 */
export class ExecutorManager implements Iterable<Executor> {
  /**
   * The map from a key to an executor.
   */
  private _executors = new Map<string, ExecutorImpl>();

  /**
   * The pubsub that handles the manager subscriptions.
   */
  private _pubSub = new PubSub<ExecutorEvent>();

  /**
   * The map from a key to an initial state that must be set to an executor before plugins are applied. Entries from
   * this map are deleted after the executor was initialized.
   */
  private _initialStates = new Map<string, ExecutorState>();

  /**
   * Creates a new executor manager.
   *
   * @param initialState The initial state of executors that are created via {@link getOrCreate}.
   */
  constructor(initialState?: ExecutorState[]) {
    if (initialState !== undefined) {
      for (const state of initialState) {
        this._initialStates.set(state.key, state);
      }
    }
  }

  /**
   * Returns an executor by its key, or `undefined` if there's no such executor.
   *
   * @param key The unique executor key.
   */
  get(key: string): Executor | undefined {
    return this._executors.get(key);
  }

  /**
   * Returns an existing executor or creates a new one.
   *
   * @param key The unique executor key.
   * @param initialValue The initial executor value.
   * @param plugins The array of plugins that are applied to the newly created executor.
   */
  getOrCreate<Value = any>(
    key: string,
    initialValue: undefined,
    plugins?: Array<ExecutorPlugin<Value> | undefined | null>
  ): Executor<Value>;

  /**
   * Returns an existing executor or creates a new one.
   *
   * @param key The unique executor key.
   * @param initialValue The initial executor value.
   * @param plugins The array of plugins that are applied to the newly created executor.
   */
  getOrCreate<Value = any>(
    key: string,
    initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
    plugins?: Array<ExecutorPlugin<Value> | undefined | null>
  ): Executor<Value>;

  getOrCreate(key: string, initialValue?: unknown, plugins?: Array<ExecutorPlugin | undefined | null>): Executor {
    let executor = this._executors.get(key);

    if (executor !== undefined) {
      return executor;
    }

    executor = Object.assign(new ExecutorImpl(key, this), this._initialStates.get(key));

    this._initialStates.delete(key);

    if (plugins !== null && plugins !== undefined) {
      for (const plugin of plugins) {
        plugin?.(executor);
      }
    }

    executor.subscribe(event => {
      this._pubSub.publish(event);
    });

    this._executors.set(key, executor);

    executor._publish('configured');

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
  waitFor(key: string): AbortablePromise<Executor> {
    return new AbortablePromise((resolve, _reject, signal) => {
      const executor = this._executors.get(key);

      if (executor !== undefined) {
        resolve(executor);
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.target.key === key && event.type === 'configured') {
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
  dispose(key: string): boolean {
    const executor = this._executors.get(key);

    if (executor === undefined || executor.isActive) {
      return false;
    }

    this._executors.delete(key);

    executor._publish('disposed');
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
}

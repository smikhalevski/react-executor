import { PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Executor, ExecutorEvent, ExecutorPlugin, ExecutorTask } from './types';

export class ExecutorManager {
  private _executors = new Map<unknown, ExecutorImpl>();
  private _pubSub = new PubSub<ExecutorEvent>();

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
  getOrCreate<Value>(
    key: string,
    initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
    plugins?: ExecutorPlugin<Value>[]
  ): Executor<Value> {
    let executor = this._executors.get(key);

    if (executor !== undefined) {
      return executor;
    }

    executor = new ExecutorImpl(key, this);

    if (plugins !== undefined) {
      for (const plugin of plugins) {
        plugin(executor);
      }
    }

    this._executors.set(key, executor);

    executor._pubSub.publish({ type: 'configured', target: executor });

    if (executor.isSettled || executor.isPending) {
      return executor;
    }
    if (typeof initialValue === 'function') {
      executor.execute(initialValue as ExecutorTask<Value>);
    } else {
      executor.resolve(initialValue);
    }
    return executor;
  }

  /**
   * Returns all executors created by this manager.
   */
  getAll(): Executor[] {
    return Array.from(this._executors.values());
  }

  /**
   * Deletes the non-{@link Executor.isActive active} executor from the manager.
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

    executor._pubSub.publish({ type: 'disposed', target: executor });

    // executor._pubSub.unsubscribeAll()

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
}

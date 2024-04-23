import { PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Executor, ExecutorEvent, ExecutorPlugin, ExecutorTask } from './types';

export class ExecutorManager {
  private _refs = new Map<unknown, { executor: ExecutorImpl; cleanups: Array<() => void> }>();
  private _pubSub = new PubSub<ExecutorEvent>();

  /**
   * Returns an executor by its key, or `undefined` if there's no such executor.
   *
   * @param key The unique executor key.
   */
  get(key: string): Executor | undefined {
    return this._refs.get(key)?.executor;
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
    const ref = this._refs.get(key);

    if (ref !== undefined) {
      return ref.executor;
    }

    const executor = new ExecutorImpl(key, this);
    const cleanups = [];

    cleanups.push(
      executor.subscribe(event => {
        this._pubSub.publish(event);
      })
    );

    if (plugins !== undefined) {
      for (const plugin of plugins) {
        const cleanup = plugin(executor);

        if (cleanup !== undefined) {
          cleanups.push(cleanup);
        }
      }
    }

    this._refs.set(key, { executor, cleanups });

    executor.pubSub.publish({ type: 'configured', target: executor });

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
   * Deletes the non-{@link Executor.isActive active} executor from the manager and invokes plugin cleanup callbacks.
   *
   * @param key The key of the executor to delete.
   * @returns `true` if the executor was disposed, or `false` if there's no such executor, or the executor is active.
   */
  dispose(key: string): boolean {
    const ref = this._refs.get(key);

    if (ref === undefined || ref.executor.isActive) {
      return false;
    }

    const { executor } = ref;

    for (const cleanup of ref.cleanups) {
      try {
        cleanup();
      } catch (error) {
        // Force uncaught exception
        setTimeout(() => {
          throw error;
        }, 0);
      }
    }

    this._refs.delete(key);

    executor.activationCount = 0;

    executor.pubSub.publish({ type: 'disposed', target: executor });

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

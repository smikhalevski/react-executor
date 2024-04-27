import { AbortablePromise, PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Executor, ExecutorEvent, ExecutorPlugin, ExecutorTask } from './types';

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

    executor.subscribe(event => {
      this._pubSub.publish(event);
    });

    this._executors.set(key, executor);

    executor._pubSub.publish({ type: 'configured', target: executor });

    if (initialValue === undefined || executor.isSettled || executor.isPending) {
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

    executor._pubSub.publish({ type: 'disposed', target: executor });
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

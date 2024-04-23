import { PubSub } from 'parallel-universe';
import { ExecutorImpl } from './ExecutorImpl';
import type { Event, Executor, Plugin, Task } from './types';

export class ExecutorManager {
  private _refs = new Map<unknown, { executor: ExecutorImpl; destructors: Array<() => void> }>();
  private _pubSub = new PubSub<Event>();

  /**
   * Returns an executor by its key, or `undefined` if there's no such executor.
   */
  get(key: string): Executor | undefined {
    return this._refs.get(key)?.executor;
  }

  /**
   * Returns an existing shared executor or creates a new one.
   */
  getOrCreate<Value>(
    key: string,
    initialValue?: Task<Value> | PromiseLike<Value> | Value,
    plugins?: Plugin<Value>[]
  ): Executor<Value> {
    const ref = this._refs.get(key);

    if (ref !== undefined) {
      return ref.executor;
    }

    const executor = new ExecutorImpl(key, this);
    const destructors = [];

    destructors.push(
      executor.subscribe(event => {
        this._pubSub.publish(event);
      })
    );

    this._refs.set(key, { executor, destructors });

    if (plugins !== undefined) {
      for (const plugin of plugins) {
        const destructor = plugin(executor);

        if (destructor !== undefined) {
          destructors.push(destructor);
        }
      }
    }

    executor.pubSub.publish({ type: 'created', target: executor });

    if (executor.isSettled || executor.isPending) {
      return executor;
    }

    if (typeof initialValue === 'function') {
      executor.execute(initialValue as Task<Value>);
    } else {
      executor.resolve(initialValue);
    }
    return executor;
  }

  dispose(key: string): boolean {
    const ref = this._refs.get(key);

    if (ref === undefined || ref.executor.isActive) {
      return false;
    }

    const { executor } = ref;

    for (const destructor of ref.destructors) {
      try {
        destructor();

        if (executor.isActive) {
          console.warn('Destructor triggered executor activation');
        }
      } catch (error) {
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

  subscribe(listener: (event: Event) => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}

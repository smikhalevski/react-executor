import { type DependencyList, useEffect, useReducer } from 'react';
import type { Executor, ExecutorPlugin, ExecutorTask } from './types';
import { useExecutorManager } from './useExecutorManager';

/**
 * Options of the {@link useExecutor} hook.
 *
 * @template Value The value stored by the executor.
 */
export interface UseExecutorOptions<Value = any> {
  /**
   * The unique executor key. All hook usages with the same key, return the same {@link Executor} instance.
   */
  key: string;

  /**
   * The initial executor value that is applied when executor is created.
   */
  initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value;

  /**
   * The array of plugins that are applied to the newly created executor.
   */
  plugins?: ExecutorPlugin<Value>[];

  /**
   * The task that is {@link Executor.execute executed} as an effect if {@link dependencies} are changed.
   */
  task?: ExecutorTask<Value>;

  /**
   * The array of dependencies that trigger re-execution of {@link task} when changed.
   */
  dependencies?: DependencyList;
}

export function useExecutor<Value>(options: UseExecutorOptions<Value>): Executor<Value>;

/**
 * Manages the async task execution process and provides ways to access task execution results, abort or replace the
 * task execution, and subscribe to its state changes.
 *
 * @param key The unique executor key. All hook usages with the same key, return the same {@link Executor} instance.
 * @param initialValue The initial executor value that is applied when executor is created by the executor manager.
 * @param plugins The array of plugins that are applied to the newly created executor.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value>(
  key: string,
  initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
  plugins?: ExecutorPlugin<Value>[]
): Executor<Value>;

export function useExecutor(
  optionsOrKey: UseExecutorOptions | string,
  initialValue?: unknown,
  plugins?: ExecutorPlugin[]
): Executor {
  const options = typeof optionsOrKey === 'string' ? { key: optionsOrKey, initialValue, plugins } : optionsOrKey;
  const { task, dependencies = [] } = options;

  const [, rerender] = useReducer(reduceCount, 0);

  const executor = useExecutorManager().getOrCreate(options.key, options.initialValue, options.plugins);

  // Subscriptions
  useEffect(() => {
    const deactivate = executor.activate();
    const unsubscribe = executor.subscribe(rerender);

    return () => {
      unsubscribe();
      deactivate();
    };
  }, [executor]);

  // Task execution
  useEffect(() => {
    if (typeof task !== 'function') {
      return;
    }
    if (executor.latestTask !== task) {
      executor.execute(task);
    } else {
      executor.retry();
    }
  }, dependencies);

  return executor;
}

function reduceCount(count: number): number {
  return count + 1;
}

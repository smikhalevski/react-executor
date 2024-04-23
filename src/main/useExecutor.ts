import { useEffect, useReducer } from 'react';
import type { Executor, ExecutorPlugin, ExecutorTask } from './types';
import { useExecutorManager } from './useExecutorManager';

/**
 * Manages the async task execution process and provides ways to access task execution results, abort or replace the
 * task execution, and subscribe to its state changes.
 *
 * @param key The unique executor key. All hook usages with the same key, return the same {@link Executor} instance.
 * @param initialValue The initial executor value.
 * @param plugins The array of plugins that are applied to the newly created executor.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value>(
  key: string,
  initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
  plugins?: ExecutorPlugin<Value>[]
): Executor<Value> {
  const [, rerender] = useReducer(reduceCount, 0);
  const executor = useExecutorManager().getOrCreate(key, initialValue, plugins);

  useEffect(() => {
    const deactivate = executor.activate();
    const unsubscribe = executor.subscribe(rerender);

    return () => {
      deactivate();
      unsubscribe();
    };
  }, [executor]);

  return executor;
}

function reduceCount(count: number): number {
  return count + 1;
}

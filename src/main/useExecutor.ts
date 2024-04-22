import { useEffect, useMemo } from 'react';
import { useRerender } from 'react-hookers';
import type { Executor, Task } from './types';
import { useExecutorManager } from './useExecutorManager';

/**
 * Manages the async task execution process and provides ways to access task execution results, abort or replace the
 * task execution, and subscribe to its state changes.
 *
 * @param key The unique executor key. All hook usages with the same key, return the same {@link Executor} instance.
 * @param initialValue The initial executor value. This value is applied to the non-{@link Executor.isPending pending}
 * executor if it isn't {@link Executor.isFulfilled fulfilled} or if it's value is
 * {@link Executor.isInvalidated invalidated}. Otherwise, this value is ignored.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value>(
  key: string,
  initialValue?: Task<Value> | PromiseLike<Value> | Value
): Executor<Value> {
  const rerender = useRerender();
  const manager = useExecutorManager();
  const executor = manager.getOrCreate(key);

  useMemo(() => {
    if (initialValue === undefined || (executor.isFulfilled && !executor.isInvalidated) || executor.isPending) {
      return;
    }
    if (typeof initialValue === 'function') {
      executor.execute(initialValue as Task<Value>);
    } else {
      executor.resolve(initialValue);
    }
  }, [executor]);

  useEffect(() => {
    const disconnect = manager.connect(key);
    const unsubscribe = executor.subscribe(rerender);

    return () => {
      disconnect();
      unsubscribe();
    };
  }, [key, executor]);

  return executor;
}

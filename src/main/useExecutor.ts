import type { AbortableCallback } from 'parallel-universe';
import { useEffect, useMemo } from 'react';
import { useRerender } from 'react-hookers';
import type { Executor } from './Executor';
import { useExecutorManager } from './useExecutorManager';
import { emptyDeps } from './utils';

export function useExecutor<T>(key: unknown, initialValue?: AbortableCallback<T> | PromiseLike<T> | T): Executor<T> {
  const rerender = useRerender();
  const manager = useExecutorManager();
  const executor = manager.getOrCreate(key);

  useMemo(() => {
    if (initialValue === undefined || (executor.isFulfilled && !executor.isInvalidated) || executor.isPending) {
      return;
    }
    if (typeof initialValue === 'function') {
      executor.execute(initialValue as AbortableCallback<T>);
    } else {
      executor.resolve(initialValue);
    }
  }, emptyDeps);

  useEffect(() => {
    const unobserve = manager.observe(key);
    const unsubscribe = executor.subscribe(rerender);

    return () => {
      unobserve();
      unsubscribe();
    };
  }, emptyDeps);

  return executor;
}

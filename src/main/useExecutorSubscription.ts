import { useDebugValue, useEffect, useSyncExternalStore } from 'react';
import type { Executor, ExecutorState } from './types.ts';

/**
 * Re-renders the component when the executor state changes.
 *
 * The executor is activated after mount and deactivated before unmount.
 *
 * @param executor The executor to subscribe to.
 * @returns The executor.
 */
export function useExecutorSubscription<Value>(executor: Executor<Value>): Executor<Value> {
  useDebugValue(executor, getExecutorStateSnapshot);

  const getSnapshot = () => getExecutorId(executor) + '.' + executor.version;

  useSyncExternalStore(executor.subscribe, getSnapshot, getSnapshot);

  useEffect(executor.activate, [executor]);

  return executor;
}

const executorIds = new WeakMap<Executor, number>();

let executorCount = 0;

function getExecutorId(executor: Executor): number {
  return executorIds.get(executor) || (executorIds.set(executor, ++executorCount), executorCount);
}

function getExecutorStateSnapshot(executor: Executor): ExecutorState {
  return executor.getStateSnapshot();
}

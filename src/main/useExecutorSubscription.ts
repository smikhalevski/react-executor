import { useCallback, useDebugValue, useEffect } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import type { Executor } from './types';

/**
 * Re-renders the component when an executor's state is changed.
 *
 * The executor is activated after mount and deactivated before unmount.
 *
 * @param executor The executor to subscribe to.
 */
export function useExecutorSubscription(executor: Executor): void {
  useDebugValue(executor, toJSON);

  const subscribe = useCallback(executor.subscribe.bind(executor), [executor]);

  useSyncExternalStore(subscribe, () => executor.version);

  useEffect(executor.activate.bind(executor), [executor]);
}

function toJSON(executor: Executor) {
  return executor.toJSON();
}

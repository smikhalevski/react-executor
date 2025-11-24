import * as React from 'react';
import type { Executor, ExecutorState } from './types.js';

/**
 * Re-renders the component when an executor's state is changed.
 *
 * The executor is activated after mount and deactivated before unmount.
 *
 * @param executor The executor to subscribe to.
 */
export function useExecutorSubscription<Value>(executor: Executor<Value>): Executor<Value> {
  React.useDebugValue(executor, getExecutorStateSnapshot);

  if (typeof React.useSyncExternalStore === 'function') {
    const getSnapshot = () => getExecutorId(executor) + '.' + executor.version;

    React.useSyncExternalStore(executor.subscribe, getSnapshot, getSnapshot);

    React.useEffect(executor.activate, [executor]);

    return executor;
  }

  const [, setVersion] = React.useState(executor.version);

  React.useEffect(() => {
    const deactivate = executor.activate();

    const unsubscribe = executor.subscribe(() => setVersion(executor.version));

    setVersion(executor.version);

    return () => {
      unsubscribe();
      deactivate();
    };
  }, [executor]);

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

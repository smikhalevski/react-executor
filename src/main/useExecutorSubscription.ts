import { useDebugValue, useEffect, useState } from 'react';
import type { Executor } from './types';

/**
 * Re-renders the component when an executor's state is changed.
 *
 * The executor is activated after mount and deactivated before unmount.
 *
 * @param executor The executor to subscribe to.
 */
export function useExecutorSubscription(executor: Executor): void {
  const [, setVersion] = useState(executor.version);

  useDebugValue(executor, toJSON);

  useEffect(() => {
    const provideVersion = (prevVersion: number) => Math.max(prevVersion, executor.version);

    const deactivate = executor.activate();
    const unsubscribe = executor.subscribe(() => {
      setVersion(provideVersion);
    });

    setVersion(provideVersion);

    return () => {
      unsubscribe();
      deactivate();
    };
  }, [executor]);
}

function toJSON(executor: Executor) {
  return executor.toJSON();
}

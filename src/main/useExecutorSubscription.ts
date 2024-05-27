import React from 'react';
import type { Executor } from './types';

/**
 * Re-renders the component when an executor's state is changed.
 *
 * The executor is activated after mount and deactivated before unmount.
 *
 * @param executor The executor to subscribe to.
 */
export function useExecutorSubscription(executor: Executor): void {
  React.useDebugValue(executor, toJSON);

  if (typeof React.useSyncExternalStore === 'function') {
    const subscribe = React.useCallback(executor.subscribe.bind(executor), [executor]);

    const getSnapshot = () => executor.version;

    React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    React.useEffect(executor.activate.bind(executor), [executor]);

    return;
  }

  const [, setVersion] = React.useState(executor.version);

  React.useEffect(() => {
    let version = executor.version;

    const deactivate = executor.activate();
    const unsubscribe = executor.subscribe(() => {
      if (version < executor.version) {
        setVersion((version = executor.version));
      }
    });

    setVersion(version);

    return () => {
      unsubscribe();
      deactivate();
    };
  }, [executor]);
}

function toJSON(executor: Executor) {
  return executor.toJSON();
}

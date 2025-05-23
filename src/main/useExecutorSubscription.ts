import * as React from 'react';
import type { Executor } from './types.js';

/**
 * Re-renders the component when an executor's state is changed.
 *
 * The executor is activated after mount and deactivated before unmount.
 *
 * @param executor The executor to subscribe to.
 */
export function useExecutorSubscription<Value>(executor: Executor<Value>): Executor<Value> {
  React.useDebugValue(executor, toJSON);

  if (typeof React.useSyncExternalStore === 'function') {
    const subscribe = React.useCallback(executor.subscribe.bind(executor), [executor]);

    const getSnapshot = () => executor.version;

    React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    React.useEffect(executor.activate.bind(executor), [executor]);

    return executor;
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

  return executor;
}

function toJSON(executor: Executor) {
  return executor.toJSON();
}

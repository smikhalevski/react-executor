/**
 * The plugin that disposes a deactivated executor after the timeout.
 *
 * ```ts
 * import disposeDeactivated from 'react-executor/plugin/disposeDeactivated';
 *
 * const executor = useExecutor('test', 42, [disposeDeactivated()]);
 * ```
 *
 * @module plugin/disposeDeactivated
 */

import type { ExecutorPlugin } from '../types';

/**
 * Disposes a deactivated executor after the timeout.
 *
 * @param ms The timeout in milliseconds after which the executor is disposed.
 */
export default function disposeDeactivated(ms = 5_000): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(() => {
            executor.manager.dispose(executor.key);
          }, ms);
          break;

        case 'activated':
          clearTimeout(timer);
          break;
      }
    });
  };
}

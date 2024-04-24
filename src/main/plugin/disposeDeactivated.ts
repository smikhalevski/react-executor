import type { ExecutorPlugin } from '../types';

/**
 * Disposes a deactivated executor after the timeout.
 *
 * @param ms The timeout in milliseconds after which the executor is disposed if it is still deactivated.
 */
export default function disposeDeactivated(ms = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'disposed':
          clearTimeout(timer);
          break;

        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(() => {
            executor.manager.dispose(executor.key);
          }, ms);
          break;
      }
    });
  };
}

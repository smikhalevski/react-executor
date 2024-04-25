import type { ExecutorPlugin } from '../types';

/**
 * Aborts pending task after the timeout when the executor is deactivated.
 *
 * @param ms The timeout in milliseconds after which the task is aborted.
 */
export default function abortDeactivated(ms = 0): ExecutorPlugin {
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
            executor.abort();
          }, ms);
          break;
      }
    });
  };
}

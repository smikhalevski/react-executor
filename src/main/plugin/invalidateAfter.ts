import type { ExecutorPlugin } from '../types';

/**
 * Invalidates the settled executor result after the timeout.
 *
 * @param ms The timeout in milliseconds after which the executor result is invalidated.
 */
export default function invalidateAfter(ms: number): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'fulfilled':
        case 'rejected':
          clearTimeout(timer);

          timer = setTimeout(
            () => {
              executor.invalidate();
            },
            ms - Date.now() + executor.timestamp
          );
          break;

        case 'disposed':
          clearTimeout(timer);
          break;
      }
    });
  };
}

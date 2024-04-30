/**
 * The plugin that invalidates the settled executor result after the timeout.
 *
 * ```ts
 * import invalidateAfter from 'react-executor/plugin/invalidateAfter';
 *
 * const executor = useExecutor('test', 42, [invalidateAfter(5_000)]);
 * ```
 *
 * @module plugin/invalidateAfter
 */

import type { ExecutorPlugin } from '../types';

/**
 * Invalidates the settled executor result after the timeout.
 *
 * @param ms The timeout in milliseconds after which the executor result is invalidated.
 */
export default function invalidateAfter(ms: number): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    if (executor.isSettled && Date.now() - executor.timestamp >= ms) {
      executor.invalidate();
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'fulfilled':
        case 'rejected':
          clearTimeout(timer);

          if (!executor.isStale && !executor.isPending && executor.isActive && executor.isSettled) {
            timer = setTimeout(
              () => {
                executor.invalidate();
              },
              ms - Date.now() + executor.timestamp
            );
          }
          break;

        case 'invalidated':
        case 'deactivated':
          clearTimeout(timer);
          break;
      }
    });
  };
}

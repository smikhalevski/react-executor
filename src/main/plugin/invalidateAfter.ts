/**
 * The plugin that invalidates the settled executor result after a timeout elapses.
 *
 * ```ts
 * import invalidateAfter from 'react-executor/plugin/invalidateAfter';
 *
 * const executor = useExecutor('test', 42, [invalidateAfter(5_000)]);
 * ```
 *
 * @module plugin/invalidateAfter
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types';

/**
 * Invalidates the settled executor result after a timeout elapses.
 *
 * @param delay The timeout in milliseconds after which the executor result is invalidated.
 */
export default function invalidateAfter(delay: number): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    if (executor.isSettled && delay - Date.now() + executor.settledAt <= 0) {
      executor.invalidate();
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'fulfilled':
        case 'rejected':
          clearTimeout(timer);

          if (!executor.isInvalidated && !executor.isPending && executor.isActive && executor.isSettled) {
            timer = setTimeout(() => executor.invalidate(), delay - Date.now() + executor.settledAt);
          }
          break;

        case 'invalidated':
        case 'deactivated':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'invalidateAfter',
      options: { delay },
    });
  };
}

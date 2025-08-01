/**
 * The plugin that invalidates the settled executor result after a delay.
 *
 * ```ts
 * import invalidateAfter from 'react-executor/plugin/invalidateAfter';
 *
 * const executor = useExecutor('test', 42, [invalidateAfter(5_000)]);
 * ```
 *
 * @module plugin/invalidateAfter
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.js';

/**
 * Invalidates the settled executor result after a delay.
 *
 * @param delay The delay in milliseconds after which the executor result is invalidated.
 */
export default function invalidateAfter(delay: number): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    if (executor.isSettled && delay - Date.now() + executor.settledAt <= 0) {
      executor.invalidate();
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'fulfilled':
        case 'rejected':
          clearTimeout(timer);

          if (!executor.isInvalidated && !executor.isPending && executor.isSettled) {
            timer = setTimeout(executor.invalidate, delay);
          }
          break;

        case 'invalidated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'invalidateAfter',
        options: { delay },
      } satisfies PluginConfiguredPayload,
    });
  };
}

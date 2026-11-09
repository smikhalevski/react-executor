/**
 * The plugin that invalidates the settled executor after a delay.
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
 * Invalidates the settled executor after a delay.
 *
 * @param delay The delay in milliseconds after which the executor result is invalidated.
 */
export default function invalidateAfter(delay: number): ExecutorPlugin {
  return executor => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleInvalidation = () => {
      if (executor.isPending) {
        // The timeout is restarted when the pending task is settled or aborted
        return;
      }

      clearTimeout(timer);

      if (executor.isSettled && !executor.isInvalidated) {
        // The delay is counted from the settlement, which may have happened before the plugin was applied
        timer = setTimeout(executor.invalidate, delay - Date.now() + executor.settledAt);
      }
    };

    if (executor.isSettled && delay - Date.now() + executor.settledAt <= 0) {
      executor.invalidate();
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'attached':
        case 'fulfilled':
        case 'rejected':
        case 'aborted':
          scheduleInvalidation();
          break;

        case 'invalidated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'invalidateAfter', options: { delay } } satisfies PluginConfiguredPayload,
    });
  };
}

/**
 * The plugin that detaches a deactivated executor after the timeout.
 *
 * ```ts
 * import detachDeactivated from 'react-executor/plugin/detachDeactivated';
 *
 * const executor = useExecutor('test', 42, [detachDeactivated()]);
 * ```
 *
 * @module plugin/detachDeactivated
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types';

/**
 * Detaches a deactivated executor after the timeout.
 *
 * @param ms The timeout in milliseconds after which the executor is detached.
 */
export default function detachDeactivated(ms = 5_000): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(() => {
            executor.manager.detach(executor.key);
          }, ms);
          break;

        case 'activated':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'detachDeactivated',
      options: { ms },
    });
  };
}

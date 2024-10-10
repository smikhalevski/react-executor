/**
 * The plugin that aborts the pending task after the timeout if the executor is deactivated. The executor must be
 * activated at least once for this plugin to have an effect.
 *
 * ```ts
 * import abortDeactivated from 'react-executor/plugin/abortDeactivated';
 *
 * const executor = useExecutor('test', heavyTask, [abortDeactivated()]);
 * ```
 *
 * @module plugin/abortDeactivated
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types';

/**
 * Aborts the pending task after the timeout if the executor is deactivated. The executor must be activated at least
 * once for this plugin to have an effect.
 *
 * @param delay The timeout in milliseconds after which the task is aborted.
 */
export default function abortDeactivated(delay = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(() => executor.abort(), delay);
          break;

        case 'activated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'abortDeactivated',
      options: { delay },
    });
  };
}

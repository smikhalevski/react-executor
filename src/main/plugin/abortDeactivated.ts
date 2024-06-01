/**
 * The plugin that aborts the pending task after the timeout if the executor is deactivated.
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
 * Aborts the pending task after the timeout if the executor is deactivated.
 *
 * @param ms The timeout in milliseconds after which the task is aborted.
 */
export default function abortDeactivated(ms = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(() => {
            executor.abort();
          }, ms);
          break;

        case 'activated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'abortDeactivated',
      options: { ms },
    });
  };
}

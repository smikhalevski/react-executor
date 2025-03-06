/**
 * The plugin that aborts the pending task after the delay if the executor is deactivated. The executor must be
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
import { emptyObject } from '../utils';

/**
 * Options of the {@link abortDeactivated} plugin.
 */
export interface AbortDeactivatedOptions {
  /**
   * The delay in milliseconds after which the task is aborted.
   *
   * @default 0
   */
  delay?: number;
}

/**
 * Aborts the pending task after the {@link AbortDeactivatedOptions.delay delay} if the executor is deactivated.
 * If an executor is re-activated during this delay, the task won't be aborted. The executor must be activated at least
 * once for this plugin to have an effect.
 *
 * @param options Abort options.
 */
export default function abortDeactivated(options: AbortDeactivatedOptions = emptyObject): ExecutorPlugin {
  const { delay = 0 } = options;

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

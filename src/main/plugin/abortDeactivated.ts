/**
 * Aborts the pending task after the delay if the executor is deactivated.
 *
 * The executor must be activated at least once for this plugin to have an effect.
 *
 * ```ts
 * import abortDeactivated from 'react-executor/plugin/abortDeactivated';
 *
 * const executor = useExecutor('test', heavyTask, [abortDeactivated()]);
 * ```
 *
 * @module plugin/abortDeactivated
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link abortDeactivated} plugin.
 */
export interface AbortDeactivatedOptions {
  /**
   * The minimum delay (in milliseconds) that must pass after an executor is deactivated before it is aborted.
   * If the executor is reactivated within this delay, it will not be aborted.
   *
   * **Note:** The executor must be activated at least once for this plugin to take effect.
   *
   * @default 0
   */
  delay?: number;
}

/**
 * Aborts the pending task after the {@link AbortDeactivatedOptions.delay delay} if the executor is deactivated.
 *
 * The executor must be activated at least once for this plugin to have an effect.
 *
 * @param options Abort options.
 */
export default function abortDeactivated(options: AbortDeactivatedOptions = emptyObject): ExecutorPlugin {
  const { delay = 0 } = options;

  return executor => {
    let timer: ReturnType<typeof setTimeout>;

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(executor.abort, delay);
          break;

        case 'activated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'abortDeactivated', options: { delay } } satisfies PluginConfiguredPayload,
    });
  };
}

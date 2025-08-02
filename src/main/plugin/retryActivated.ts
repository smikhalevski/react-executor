/**
 * The plugin that retries the latest task if the executor is activated.
 *
 * ```ts
 * import retryActivated from 'react-executor/plugin/retryActivated';
 *
 * const executor = useExecutor('test', () => 42, [retryActivated()]);
 *
 * executor.activate();
 * ```
 *
 * @module plugin/retryActivated
 */

import { ExecutorPlugin, type PluginConfiguredPayload } from '../types.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link retryActivated} plugin.
 */
export interface RetryActivatedOptions {
  /**
   * The minimum delay (in milliseconds) between the executor activation and the last settlement before retrying
   * the latest task.
   *
   * @default 0
   */
  delayAfterSettled?: number;
}

/**
 * Retries the latest task if the executor is activated.
 *
 * @param options Retry options.
 */
export default function retryActivated(options: RetryActivatedOptions = emptyObject): ExecutorPlugin {
  const { delayAfterSettled = 0 } = options;

  return executor => {
    executor.subscribe(event => {
      if (event.type === 'activated' && Date.now() - executor.settledAt >= delayAfterSettled) {
        executor.retry();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'retryActivated', options: { delayAfterSettled } } satisfies PluginConfiguredPayload,
    });
  };
}

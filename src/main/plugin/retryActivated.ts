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
   * The minimum delay in milliseconds that should pass between the activation and the moment the executor was last
   * settled.
   *
   * @default 0
   */
  staleDelay?: number;
}

/**
 * Retries the latest task if the executor is activated.
 *
 * @param options Retry options.
 */
export default function retryActivated(options: RetryActivatedOptions = emptyObject): ExecutorPlugin {
  const { staleDelay = 0 } = options;

  return executor => {
    executor.subscribe(event => {
      if (event.type === 'activated' && Date.now() - executor.settledAt >= staleDelay) {
        executor.retry();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'retryActivated',
        options: { staleDelay },
      } satisfies PluginConfiguredPayload,
    });
  };
}

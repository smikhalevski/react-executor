/**
 * The plugin that retries the last task if the executor is invalidated.
 *
 * ```ts
 * import retryInvalidated from 'react-executor/plugin/retryInvalidated';
 *
 * const executor = useExecutor('test', heavyTask, [retryInvalidated()]);
 * ```
 *
 * @module plugin/retryInvalidated
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link retryInvalidated} plugin.
 */
export interface RetryInvalidatedOptions {
  /**
   * If `true` then executor is retried even if it isn't {@link react-executor!Executor.isActive active}.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the last task if the executor is invalidated.
 */
export default function retryInvalidated(options: RetryInvalidatedOptions = emptyObject): ExecutorPlugin {
  const { isEager = false } = options;

  return executor => {
    executor.subscribe(event => {
      if (
        (event.type === 'invalidated' && (isEager || executor.isActive)) ||
        (event.type === 'activated' && executor.isInvalidated)
      ) {
        executor.retry();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'retryInvalidated', options: { isEager } } satisfies PluginConfiguredPayload,
    });
  };
}

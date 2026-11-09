/**
 * The plugin that retries the latest task if the executor is invalidated.
 *
 * ```ts
 * import retryInvalidated from 'react-executor/plugin/retryInvalidated';
 *
 * const executor = useExecutor('test', heavyTask, [retryInvalidated()]);
 * ```
 *
 * @module plugin/retryInvalidated
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.ts';

/**
 * Options of the {@link retryInvalidated} plugin.
 */
export interface RetryInvalidatedOptions {
  /**
   * If `true`, the executor is retried even if it isn't {@link react-executor!Executor.isActive active}.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the latest task if the executor is invalidated.
 *
 * @param options Plugin options.
 */
export default function retryInvalidated(options: RetryInvalidatedOptions = {}): ExecutorPlugin {
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

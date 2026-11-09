/**
 * The plugin that retries the latest task after a delay if the executor is rejected.
 *
 * ```ts
 * import retryRejected from 'react-executor/plugin/retryRejected';
 *
 * const executor = useExecutor('test', heavyTask, [retryRejected()]);
 * ```
 *
 * @module plugin/retryRejected
 */

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types.ts';

/**
 * Options of the {@link retryRejected} plugin.
 *
 * @template Value The value stored by the executor.
 */
export interface RetryRejectedOptions<Value> {
  /**
   * The maximum number of consecutive retries.
   *
   * @default 3
   */
  count?: number;

  /**
   * The delay (in milliseconds) between the rejection and the next retry, or a callback that receives the index of
   * the retry and the executor, and returns the delay.
   *
   * By default, an exponential backoff is used: 1000, 1800, 3240 milliseconds, and so on.
   */
  delay?: number | ((index: number, executor: Executor<Value>) => number);

  /**
   * If `true`, the executor is retried even if it isn't {@link Executor.isActive active}.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the latest task after a delay if the executor is rejected.
 *
 * @param options Plugin options.
 * @template Value The value stored by the executor.
 */
export default function retryRejected<Value = any>(options: RetryRejectedOptions<Value> = {}): ExecutorPlugin<Value> {
  const { count = 3, delay = exponentialBackoff, isEager = false } = options;

  return executor => {
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'rejected':
          clearTimeout(timer);

          if (!executor.isPending && (isEager || executor.isActive) && executor.isRejected && index < count) {
            timer = setTimeout(
              () => {
                index++;
                executor.retry();
              },
              (typeof delay === 'function' ? delay(index, executor) : delay) - Date.now() + executor.settledAt
            );
          }
          break;

        case 'fulfilled':
        case 'aborted':
        case 'deactivated':
        case 'detached':
          index = 0;
          clearTimeout(timer);
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'retryRejected', options: { count, delay, isEager } } satisfies PluginConfiguredPayload,
    });
  };
}

function exponentialBackoff(index: number): number {
  return 1000 * Math.pow(1.8, index);
}

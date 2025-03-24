/**
 * The plugin that retries the last task if it has is failed.
 *
 * ```ts
 * import retryRejected from 'react-executor/plugin/retryRejected';
 *
 * const executor = useExecutor('test', heavyTask, [retryRejected()]);
 * ```
 *
 * @module plugin/retryRejected
 */

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types';
import { emptyObject } from '../utils';

/**
 * Options of the {@link retryRejected} plugin.
 *
 * @template Value The value stored by the executor.
 */
export interface RetryRejectedOptions<Value> {
  /**
   * The number of times the task must be repeated if it fails.
   *
   * @default 3
   */
  count?: number;

  /**
   * The delay in milliseconds after which the retry is scheduled.
   *
   * By default, an exponential backoff is used.
   */
  delay?: number | ((index: number, executor: Executor<Value>) => number);

  /**
   * If `true` then executor is retried even if it isn't {@link Executor.isActive active}.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the last task if it has is failed.
 *
 * @param options Retry options.
 * @template Value The value stored by the executor.
 */
export default function retryRejected<Value = any>(
  options: RetryRejectedOptions<Value> = emptyObject
): ExecutorPlugin<Value> {
  const { count = 3, delay = exponentialBackoff, isEager = false } = options;

  return executor => {
    let timer: NodeJS.Timeout;
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

    executor.publish('plugin_configured', {
      type: 'retryRejected',
      options: { count, delay, isEager },
    } satisfies PluginConfiguredPayload);
  };
}

function exponentialBackoff(index: number): number {
  return 1000 * 1.8 ** index;
}

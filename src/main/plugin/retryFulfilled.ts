/**
 * The plugin that retries the last task if the executor is fulfilled.
 *
 * ```ts
 * import retryFulfilled from 'react-executor/plugin/retryFulfilled';
 *
 * const executor = useExecutor('test', heavyTask, [retryFulfilled()]);
 * ```
 *
 * @module plugin/retryFulfilled
 */

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link retryFulfilled} plugin.
 *
 * @template Value The value stored by the executor.
 */
export interface RetryFulfilledOptions<Value> {
  /**
   * The number of repetitions.
   *
   * @default Infinity
   */
  count?: number;

  /**
   * The delay in milliseconds after which the repetition is scheduled.
   *
   * @default 5_000
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
 * Retries the last task if the executor is fulfilled.
 *
 * @param options Retry options.
 * @template Value The value stored by the executor.
 */
export default function retryFulfilled<Value = any>(
  options: RetryFulfilledOptions<Value> = emptyObject
): ExecutorPlugin<Value> {
  const { count = Infinity, delay = 5000, isEager = false } = options;

  return executor => {
    let timer: NodeJS.Timeout;
    let index = 0;

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'fulfilled':
          clearTimeout(timer);

          if (!executor.isPending && (isEager || executor.isActive) && executor.isFulfilled && index < count) {
            timer = setTimeout(
              () => {
                index++;
                executor.retry();
              },
              (typeof delay === 'function' ? delay(index, executor) : delay) - Date.now() + executor.settledAt
            );
          }
          break;

        case 'rejected':
        case 'aborted':
        case 'deactivated':
        case 'detached':
          index = 0;
          clearTimeout(timer);
          break;
      }
    });

    executor.publish('plugin_configured', {
      type: 'retryFulfilled',
      options: { count, delay, isEager },
    } satisfies PluginConfiguredPayload);
  };
}

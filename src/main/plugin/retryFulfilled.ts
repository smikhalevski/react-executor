/**
 * The plugin that repeats the last task after the execution was fulfilled.
 *
 * ```ts
 * import retryFulfilled from 'react-executor/plugin/retryFulfilled';
 *
 * const executor = useExecutor('test', 42, [retryFulfilled()]);
 * ```
 *
 * @module plugin/retryFulfilled
 */

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types';

/**
 * Repeats the last task after the execution was fulfilled.
 *
 * @param count The number of repetitions.
 * @param ms The delay in milliseconds after which the repetition is scheduled.
 * @template Value The value stored by the executor.
 */
export default function retryFulfilled<Value = any>(
  count = Infinity,
  ms: number | ((index: number, executor: Executor<Value>) => number) = 5_000
): ExecutorPlugin<Value> {
  return executor => {
    let timer: NodeJS.Timeout;
    let index = 0;

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'fulfilled':
          clearTimeout(timer);

          if (!executor.isPending && executor.isActive && executor.isFulfilled && index < count) {
            timer = setTimeout(
              () => {
                index++;
                executor.retry();
              },
              (typeof ms === 'function' ? ms(index, executor) : ms) - Date.now() + executor.settledAt
            );
          }
          break;

        case 'rejected':
        case 'aborted':
        case 'deactivated':
          index = 0;
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'retryFulfilled',
      options: { count, ms },
    });
  };
}

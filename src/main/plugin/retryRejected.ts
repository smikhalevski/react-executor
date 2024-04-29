/**
 * The plugin that retries the last task after the execution has failed.
 *
 * ```ts
 * import retryRejected from 'react-executor/plugin/retryRejected';
 *
 * const executor = useExecutor('test', 42, [retryRejected()]);
 * ```
 *
 * @module plugin/retryRejected
 */

import type { Executor, ExecutorPlugin } from '../types';

/**
 * Retries the last task after the execution has failed.
 *
 * @param count The number of times the task must be repeated if rejected.
 * @param ms The delay in milliseconds after which the retry is scheduled.
 * @template Value The value stored by the executor.
 */
export default function retryRejected<Value = any>(
  count = 3,
  ms: number | ((index: number, executor: Executor<Value>) => number) = exponentialDelay
): ExecutorPlugin<Value> {
  return executor => {
    let timer: NodeJS.Timeout;
    let index = 0;

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
        case 'rejected':
          clearTimeout(timer);

          if (!executor.isPending && executor.isActive && executor.isRejected && index < count) {
            timer = setTimeout(
              () => {
                index++;
                executor.retry();
              },
              (typeof ms === 'function' ? ms(index, executor) : ms) - Date.now() + executor.timestamp
            );
          }
          break;

        case 'fulfilled':
        case 'aborted':
        case 'deactivated':
          index = 0;
          clearTimeout(timer);
          break;
      }
    });
  };
}

function exponentialDelay(index: number): number {
  return 1000 * 1.8 ** index;
}

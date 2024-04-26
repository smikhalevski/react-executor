import type { Executor, ExecutorPlugin } from '../types';

/**
 * Retries the last task after the execution has failed.
 *
 * @param count The number of times the task must be repeated if rejected.
 * @param ms The delay in milliseconds after which the retry is scheduled.
 * @template Value The value stored by the executor.
 */
export default function retryRejected<Value = any>(
  count = 5,
  ms: number | ((index: number, executor: Executor<Value>) => number) = 0
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

import type { Executor, ExecutorPlugin } from '../types';

/**
 * Repeats the last task after the execution was fulfilled.
 *
 * @param count The number of repetitions.
 * @param ms The delay in milliseconds after which the repetition is scheduled.
 * @template Value The value stored by the executor.
 */
export default function retryFulfilled<Value = any>(
  count = Infinity,
  ms: number | ((index: number, executor: Executor<Value>) => number) = 0
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
              (typeof ms === 'function' ? ms(index, executor) : ms) - Date.now() + executor.timestamp
            );
          }
          break;

        case 'rejected':
        case 'aborted':
        case 'deactivated':
        case 'disposed':
          index = 0;
          clearTimeout(timer);
          break;
      }
    });
  };
}

import type { ExecutorPlugin } from '../types';

/**
 * Retries the latest task of the connected executor if it was invalidated.
 */
export default function retryPlugin(): ExecutorPlugin {
  return executor => {
    if (executor.isInvalidated) {
      executor.retry();
    }

    return executor.subscribe(event => {
      if (event.type === 'invalidated') {
        executor.retry();
      }
    });
  };
}

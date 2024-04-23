import type { Plugin } from '../types';

/**
 * Retries the last task of the connected executor if it was invalidated.
 */
export default function retryPlugin(): Plugin {
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

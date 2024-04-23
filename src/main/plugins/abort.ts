import type { ExecutorPlugin } from '../types';

/**
 * Aborts pending task when executor is deactivated.
 */
export default function abortPlugin(): ExecutorPlugin {
  return executor =>
    executor.subscribe(event => {
      if (event.type === 'deactivated') {
        executor.abort();
      }
    });
}

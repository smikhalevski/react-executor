import type { Plugin } from '../types';

/**
 * Aborts pending task when executor is deactivated.
 */
export default function abortPlugin(): Plugin {
  return executor =>
    executor.subscribe(event => {
      if (event.type === 'deactivated') {
        executor.abort();
      }
    });
}

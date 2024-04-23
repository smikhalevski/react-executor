import type { Plugin } from '../types';

/**
 * Disposes deactivated executor after a given timeout.
 */
export default function disposePlugin(): Plugin {
  return executor => {
    return executor.subscribe(event => {
      if (event.type === 'deactivated') {
        setTimeout(() => {
          if (!executor.isActive) {
            executor.manager.dispose(executor.key);
          }
        }, 0);
      }
    });
  };
}

import type { ExecutorPlugin } from '../types';

/**
 * Disposes deactivated executor after a given timeout.
 */
export default function disposePlugin(): ExecutorPlugin {
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

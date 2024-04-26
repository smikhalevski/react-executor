import type { ExecutorPlugin } from '../types';

/**
 * Retries the latest task of the active executor if it was invalidated.
 */
export default function retryStale(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if ((event.type === 'invalidated' && executor.isActive) || (event.type === 'activated' && executor.isStale)) {
      executor.retry();
    }
  });
};

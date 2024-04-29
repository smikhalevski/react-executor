/**
 * The plugin that retries the latest task of the active executor if it was invalidated.
 *
 * ```ts
 * import retryStale from 'react-executor/plugin/retryStale';
 *
 * const executor = useExecutor('test', 42, [retryStale()]);
 * ```
 *
 * @module plugin/retryStale
 */

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

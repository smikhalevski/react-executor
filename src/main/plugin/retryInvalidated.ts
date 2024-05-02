/**
 * The plugin that retries the latest task of the active executor if it was invalidated.
 *
 * ```ts
 * import retryInvalidated from 'react-executor/plugin/retryInvalidated';
 *
 * const executor = useExecutor('test', 42, [retryInvalidated()]);
 * ```
 *
 * @module plugin/retryInvalidated
 */

import type { ExecutorPlugin } from '../types';

/**
 * Retries the latest task of the active executor if it was invalidated.
 */
export default function retryInvalidated(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if ((event.type === 'invalidated' && executor.isActive) || (event.type === 'activated' && executor.isInvalidated)) {
      executor.retry();
    }
  });
};

/**
 * The plugin that invalidates the executor result if another executor with a matching key is fulfilled or invalidated.
 *
 * ```ts
 * import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';
 *
 * const executor = useExecutor('test', 42, [
 *   invalidateByPeers(executor => executor.key === 'exact_executor_key')
 * ]);
 * ```
 *
 * @module plugin/invalidateByPeers
 */

import type { Executor, ExecutorPlugin } from '../types';

/**
 * Invalidates the executor result if another executor with a matching key is fulfilled or invalidated.
 *
 * @param peerMatcher The callback that returns a truthy value for a matching peer executor.
 */
export default function invalidateByPeers(peerMatcher: (executor: Executor) => any): ExecutorPlugin {
  return executor => {
    const unsubscribe = executor.manager.subscribe(event => {
      if (event.target === executor) {
        if (event.type === 'disposed') {
          unsubscribe();
        }
        return;
      }

      if ((event.type === 'invalidated' || event.type === 'fulfilled') && peerMatcher(event.target)) {
        executor.invalidate();
      }
    });
  };
}

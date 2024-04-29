/**
 * The plugin that invalidates the executor result if another executor with a matching key is fulfilled or invalidated.
 *
 * ```ts
 * import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';
 *
 * const executor = useExecutor('test', 42, [
 *   invalidateByPeers([/executor_key_pattern/, 'exact_executor_key'])
 * ]);
 * ```
 *
 * @module plugin/invalidateByPeers
 */

import type { ExecutorPlugin } from '../types';
import { isMatchingPeerKey } from '../utils';

/**
 * Invalidates the executor result if another executor with a matching key is fulfilled or invalidated.
 *
 * @param keys The array of executor keys and key patterns.
 */
export default function invalidateByPeers(keys: Array<RegExp | string>): ExecutorPlugin {
  return executor => {
    const unsubscribe = executor.manager.subscribe(event => {
      if ((event.type === 'invalidated' || event.type === 'fulfilled') && isMatchingPeerKey(keys, event.target.key)) {
        executor.invalidate();
      }
    });

    executor.subscribe(event => {
      if (event.type === 'disposed') {
        unsubscribe();
      }
    });
  };
}

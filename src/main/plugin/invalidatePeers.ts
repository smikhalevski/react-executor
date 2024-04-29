/**
 * The plugin that invalidates peer executors with matching keys if the executor is fulfilled or invalidated.
 *
 * ```ts
 * import invalidatePeers from 'react-executor/plugin/invalidatePeers';
 *
 * const executor = useExecutor('test', 42, [
 *   invalidatePeers([/executor_key_pattern/, 'exact_executor_key'])
 * ]);
 * ```
 *
 * @module plugin/invalidatePeers
 */

import type { ExecutorPlugin } from '../types';
import { isMatchingPeerKey } from '../utils';

/**
 * Invalidates peer executors with matching keys if the executor is fulfilled or invalidated.
 *
 * @param keys The array of executor keys and key patterns.
 */
export default function invalidatePeers(keys: Array<RegExp | string>): ExecutorPlugin {
  return executor => {
    executor.subscribe(event => {
      if (event.type !== 'invalidated' && event.type !== 'fulfilled') {
        return;
      }

      for (const peerExecutor of executor.manager) {
        if (isMatchingPeerKey(keys, event.target.key)) {
          peerExecutor.invalidate();
        }
      }
    });
  };
}

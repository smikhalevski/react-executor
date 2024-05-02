/**
 * The plugin that invalidates peer executors with matching keys if the executor is fulfilled or invalidated.
 *
 * ```ts
 * import invalidatePeers from 'react-executor/plugin/invalidatePeers';
 *
 * const executor = useExecutor('test', 42, [
 *   invalidatePeers(executor => executor.key === 'exact_executor_key')
 * ]);
 * ```
 *
 * @module plugin/invalidatePeers
 */

import type { Executor, ExecutorPlugin } from '../types';

/**
 * Invalidates peer executors with matching keys if the executor is fulfilled or invalidated.
 *
 * @param peerMatcher The callback that returns a truthy value for a matching peer executor.
 */
export default function invalidatePeers(peerMatcher: (executor: Executor) => any): ExecutorPlugin {
  return executor => {
    const peerExecutors: Executor[] = [];

    for (const peerExecutor of executor.manager) {
      if (peerMatcher(peerExecutor)) {
        peerExecutors.push(peerExecutor);
      }
    }

    const unsubscribe = executor.manager.subscribe(event => {
      if (event.target === executor) {
        switch (event.type) {
          case 'invalidated':
          case 'fulfilled':
            for (const peerExecutor of peerExecutors) {
              peerExecutor.invalidate();
            }
            break;

          case 'disposed':
            unsubscribe();
        }
        return;
      }

      if ((event.type === 'configured' || event.type === 'disposed') && peerMatcher(event.target)) {
        if (event.type === 'configured') {
          peerExecutors.push(executor);
        } else {
          peerExecutors.splice(peerExecutors.indexOf(executor), 1);
        }
      }
    });
  };
}

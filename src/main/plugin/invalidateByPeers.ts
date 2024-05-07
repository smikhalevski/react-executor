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

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types';

/**
 * Invalidates the executor result if another executor with a matching key is fulfilled or invalidated.
 *
 * @param peerMatcher The callback that returns a truthy value for a matching peer executor.
 */
export default function invalidateByPeers(peerMatcher: (executor: Executor) => any): ExecutorPlugin {
  return executor => {
    const peerExecutors = new Set(Array.from(executor.manager).filter(peerMatcher));

    const unsubscribe = executor.manager.subscribe(event => {
      const peerExecutor = event.target;

      if (peerExecutor === executor) {
        if (event.type === 'detached') {
          unsubscribe();
        }
        return;
      }

      if (
        (event.type === 'attached' && peerMatcher(peerExecutor)) ||
        (event.type === 'detached' && peerExecutors.has(peerExecutor))
      ) {
        if (event.type === 'attached') {
          peerExecutors.add(peerExecutor);
        } else {
          peerExecutors.delete(peerExecutor);
        }

        executor.publish<PluginConfiguredPayload>('plugin_configured', {
          type: 'invalidateByPeers',
          options: { peerExecutors: Array.from(peerExecutors) },
        });
      }

      if ((event.type === 'invalidated' || event.type === 'fulfilled') && peerExecutors.has(peerExecutor)) {
        executor.invalidate();
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'invalidateByPeers',
      options: { peerExecutors: Array.from(peerExecutors) },
    });
  };
}

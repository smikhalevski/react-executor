/**
 * The plugin that invalidates the executor result if another executor is fulfilled or invalidated.
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

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types.js';

/**
 * Invalidates the executor result if another executor is fulfilled or invalidated.
 *
 * @param peerMatcher A collection of peer executors or a callback that returns a truthy value for a matching peer
 * executor.
 */
export default function invalidateByPeers(
  peerMatcher: Iterable<Executor> | ((executor: Executor) => any)
): ExecutorPlugin {
  return executor => {
    const peerExecutors = new Set(
      typeof peerMatcher === 'function' ? Array.from(executor.manager).filter(peerMatcher) : peerMatcher
    );

    const unsubscribe = executor.manager.subscribe(event => {
      const { type: eventType, target: peerExecutor } = event;

      if (peerExecutor === executor) {
        if (eventType === 'detached') {
          unsubscribe();
        }
        return;
      }

      if (
        (eventType === 'attached' &&
          typeof peerMatcher === 'function' &&
          peerMatcher(peerExecutor) &&
          (peerExecutors.add(peerExecutor), true)) ||
        (eventType === 'detached' && peerExecutors.delete(peerExecutor))
      ) {
        executor.publish('plugin_configured', {
          type: 'invalidateByPeers',
          options: { peerExecutors: Array.from(peerExecutors) },
        } satisfies PluginConfiguredPayload);
      }

      if ((eventType === 'invalidated' || eventType === 'fulfilled') && peerExecutors.has(peerExecutor)) {
        executor.invalidate();
      }
    });

    executor.publish('plugin_configured', {
      type: 'invalidateByPeers',
      options: { peerExecutors: Array.from(peerExecutors) },
    } satisfies PluginConfiguredPayload);
  };
}

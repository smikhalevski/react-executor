/**
 * The plugin that invalidates the executor result if another executor is fulfilled or invalidated.
 *
 * ```ts
 * import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';
 *
 * const executor = useExecutor('test', 42, [
 *   invalidateByPeers(executor => executor.key === 'exact_executor_key'),
 * ]);
 * ```
 *
 * @module plugin/invalidateByPeers
 */

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types.js';

/**
 * Invalidates the executor result if another executor is fulfilled or invalidated.
 *
 * @param predicate A collection of peer executors or a callback that returns a truthy value for a matching peer
 * executor.
 */
export default function invalidateByPeers(
  predicate: Iterable<Executor> | ((executor: Executor) => any)
): ExecutorPlugin {
  return executor => {
    const peers = new Set(typeof predicate === 'function' ? Array.from(executor.manager).filter(predicate) : predicate);

    const unsubscribe = executor.manager.subscribe(event => {
      const { type: eventType, target: peer } = event;

      if (peer === executor) {
        if (eventType === 'detached') {
          unsubscribe();
        }
        return;
      }

      if (
        (eventType === 'attached' && typeof predicate === 'function' && predicate(peer) && peers.add(peer)) ||
        (eventType === 'detached' && peers.delete(peer))
      ) {
        executor.publish({
          type: 'plugin_configured',
          payload: {
            type: 'invalidateByPeers',
            options: { peers: Array.from(peers) },
          } satisfies PluginConfiguredPayload,
        });
      }

      if ((eventType === 'invalidated' || eventType === 'fulfilled') && peers.has(peer)) {
        executor.invalidate();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'invalidateByPeers',
        options: { peers: Array.from(peers) },
      } satisfies PluginConfiguredPayload,
    });
  };
}

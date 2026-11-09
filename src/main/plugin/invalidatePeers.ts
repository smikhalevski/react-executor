/**
 * The plugin that invalidates peer executors if the executor is fulfilled or invalidated.
 *
 * ```ts
 * import invalidatePeers from 'react-executor/plugin/invalidatePeers';
 *
 * const executor = useExecutor('test', 42, [
 *   invalidatePeers(executor => executor.key === 'exact_executor_key'),
 * ]);
 * ```
 *
 * @module plugin/invalidatePeers
 */

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types.ts';

/**
 * Invalidates peer executors if the executor is fulfilled or invalidated.
 *
 * **Note:** Peers must not invalidate each other in a cycle. In a cycle, invalidation comes back to the executor that
 * started it, and with `retryInvalidated` the executors keep re-running their tasks forever.
 *
 * @param predicate A collection of peer executors, or a callback that returns a truthy value for a peer executor.
 */
export default function invalidatePeers(predicate: Iterable<Executor> | ((executor: Executor) => any)): ExecutorPlugin {
  return executor => {
    const peers = new Set(typeof predicate === 'function' ? Array.from(executor.manager).filter(predicate) : predicate);

    const unsubscribe = executor.manager.subscribe(event => {
      const { type: eventType, target: peer } = event;

      if (peer === executor) {
        switch (eventType) {
          case 'invalidated':
          case 'fulfilled':
            for (const peer of peers) {
              peer.invalidate();
            }
            break;

          case 'detached':
            unsubscribe();
            break;
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
            type: 'invalidatePeers',
            options: { peers: Array.from(peers) },
          } satisfies PluginConfiguredPayload,
        });
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'invalidatePeers',
        options: { peers: Array.from(peers) },
      } satisfies PluginConfiguredPayload,
    });
  };
}

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

import type { Executor, ExecutorPlugin, PluginConfiguredPayload } from '../types.js';

/**
 * Invalidates peer executors with matching keys if the executor is fulfilled or invalidated.
 *
 * @param peerMatcher The callback that returns a truthy value for a matching peer executor.
 */
export default function invalidatePeers(
  peerMatcher: Iterable<Executor> | ((executor: Executor) => any)
): ExecutorPlugin {
  return executor => {
    const peerExecutors = new Set(
      typeof peerMatcher === 'function' ? Array.from(executor.manager).filter(peerMatcher) : peerMatcher
    );

    const unsubscribe = executor.manager.subscribe(event => {
      const { type: eventType, target: peerExecutor } = event;

      if (peerExecutor === executor) {
        switch (eventType) {
          case 'invalidated':
          case 'fulfilled':
            for (const peerExecutor of peerExecutors) {
              peerExecutor.invalidate();
            }
            break;

          case 'detached':
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
          type: 'invalidatePeers',
          options: { peerExecutors: Array.from(peerExecutors) },
        } satisfies PluginConfiguredPayload);
      }
    });

    executor.publish('plugin_configured', {
      type: 'invalidatePeers',
      options: { peerExecutors: Array.from(peerExecutors) },
    } satisfies PluginConfiguredPayload);
  };
}

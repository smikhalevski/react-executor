/**
 * The plugin that sets an executor task but doesn't execute it.
 *
 * ```ts
 * import lazyTask from 'react-executor/plugin/lazyTask';
 *
 * const executor = useExecutor('test', 42, [
 *   lazyTask(async () => await getTheMeaningOfLife()),
 * ]);
 * ```
 *
 * @module plugin/lazyTask
 */

import type { ExecutorPlugin, ExecutorTaskCallback, PluginConfiguredPayload } from '../types.js';

/**
 * Sets an executor task but doesn't execute it.
 *
 * @param callback The task that is set to an executor.
 */
export default function lazyTask<Value>(callback: ExecutorTaskCallback<Value>): ExecutorPlugin<Value> {
  return executor => {
    executor.task = { callback };

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'lazyTask', options: { callback } } satisfies PluginConfiguredPayload,
    });
  };
}

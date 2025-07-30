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

import type { ExecutorPlugin, ExecutorTask, PluginConfiguredPayload } from '../types.js';

/**
 * Sets an executor task but doesn't execute it.
 *
 * @param task The task that is set to an executor.
 */
export default function lazyTask<Value>(task: ExecutorTask<Value>): ExecutorPlugin<Value> {
  return executor => {
    executor.task = task;

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'lazyTask',
        options: { task },
      } satisfies PluginConfiguredPayload,
    });
  };
}

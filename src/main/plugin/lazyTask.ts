/**
 * The plugin that sets the latest task of an executor without executing it.
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

import type { ExecutorPlugin, ExecutorTask, ExecutorTaskCallback, PluginConfiguredPayload } from '../types.ts';

/**
 * Sets the latest task of an executor without executing it. The task can be executed later with
 * {@link react-executor!Executor.retry retry}.
 *
 * @param task The task, or the task callback, to set.
 */
export default function lazyTask<Value>(
  task: ExecutorTask<Value> | ExecutorTaskCallback<Value>
): ExecutorPlugin<Value> {
  return executor => {
    if (typeof task === 'function') {
      task = { callback: task };
    }

    executor.task = task;

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'lazyTask', options: { task } } satisfies PluginConfiguredPayload,
    });
  };
}

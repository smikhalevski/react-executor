/**
 * The plugin that aborts the pending task with a {@link !DOMException TimeoutError} if the task takes longer than
 * the delay.
 *
 * ```ts
 * import abortPendingAfter from 'react-executor/plugin/abortPendingAfter';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortPendingAfter(10_000),
 * ]);
 * ```
 *
 * @module plugin/abortPendingAfter
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.ts';
import { TimeoutError } from '../utils.ts';

/**
 * Aborts the pending task with a {@link !DOMException TimeoutError} if the task takes longer than the delay.
 *
 * @param delay The delay (in milliseconds) after which the pending task is aborted.
 */
export default function abortPendingAfter(delay: number): ExecutorPlugin {
  return executor => {
    let timer: ReturnType<typeof setTimeout>;

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          clearTimeout(timer);

          timer = setTimeout(executor.abort, delay, TimeoutError('The task execution took too long'));
          break;

        case 'fulfilled':
        case 'rejected':
        case 'aborted':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'abortPendingAfter', options: { delay } } satisfies PluginConfiguredPayload,
    });
  };
}

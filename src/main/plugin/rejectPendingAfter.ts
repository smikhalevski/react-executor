/**
 * The plugin that aborts the pending task and rejects the executor with {@link !DOMException TimeoutError} if the task
 * execution took longer then the delay.
 *
 * ```ts
 * import rejectPendingAfter from 'react-executor/plugin/rejectPendingAfter';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   rejectPendingAfter(10_000),
 * ]);
 * ```
 *
 * @module plugin/rejectPendingAfter
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.js';
import { TimeoutError } from '../utils.js';

/**
 * Aborts the pending task and rejects the executor with {@link !DOMException TimeoutError} if the task execution took
 * longer then the delay.
 *
 * @param delay The delay in milliseconds after which the executor is rejected.
 */
export default function rejectPendingAfter(delay: number): ExecutorPlugin {
  return executor => {
    let timer: ReturnType<typeof setTimeout>;

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          timer = setTimeout(
            error => {
              executor.abort(error);
              executor.reject(error);
            },
            delay,
            TimeoutError('The task execution took too long')
          );
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
      payload: { type: 'rejectPendingAfter', options: { delay } } satisfies PluginConfiguredPayload,
    });
  };
}

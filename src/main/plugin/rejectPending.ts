/**
 * The plugin that aborts the pending task and rejects the executor with {@link !DOMException TimeoutError} if the task
 * execution took longer then the given timeout.
 *
 * ```ts
 * import rejectPending from 'react-executor/plugin/rejectPending';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   rejectPending(10_000)
 * ]);
 * ```
 *
 * @module plugin/rejectPending
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types';
import { TimeoutError } from '../utils';

/**
 * Aborts the pending task and rejects the executor with {@link !DOMException TimeoutError} if the task execution took
 * longer then the given timeout.
 *
 * @param ms The timeout in milliseconds after which the executor is rejected.
 */
export default function rejectPending(ms: number): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          timer = setTimeout(() => {
            const error = TimeoutError('The task execution took too long');
            executor.abort(error);
            executor.reject(error);
          }, ms);
          break;

        case 'fulfilled':
        case 'rejected':
        case 'aborted':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'rejectPending',
      options: { ms },
    });
  };
}

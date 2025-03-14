/**
 * The plugin that aborts the pending task with {@link !DOMException TimeoutError} if the task execution took longer
 * then the given timeout.
 *
 * ```ts
 * import abortPending from 'react-executor/plugin/abortPending';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortPending(10_000)
 * ]);
 * ```
 *
 * @module plugin/abortPending
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types';
import { TimeoutError } from '../utils';

/**
 * Aborts the pending task with {@link !DOMException TimeoutError} if the task execution took longer then the given
 * timeout.
 *
 * @param delay The timeout in milliseconds after which the task is aborted.
 */
export default function abortPending(delay: number): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout;

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          clearTimeout(timer);

          timer = setTimeout(() => executor.abort(TimeoutError('The task execution took too long')), delay);
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
      type: 'abortPending',
      options: { delay },
    });
  };
}

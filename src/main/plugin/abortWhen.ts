/**
 * The plugin that aborts the pending task if the observable emits `false`.
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import navigatorOffline from 'react-executor/observable/navigatorOffline';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(navigatorOffline),
 * ]);
 * ```
 *
 * @module plugin/abortWhen
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link abortWhen} plugin.
 */
export interface AbortWhenOptions {
  /**
   * The delay in milliseconds after `true` is emitted by the observer and before the executor is aborted. If `false`
   * is emitted during this delay, then executor isn't aborted.
   *
   * @default 0
   */
  delay?: number;
}

/**
 * Aborts the pending task if the observable emits `true`. If a new task is executed after the observable emitted
 * `true`, then it is instantly aborted.
 *
 * @param observable The observable that trigger the abort of the executor.
 * @param options Abort options.
 */
export default function abortWhen(
  observable: Observable<boolean>,
  options: AbortWhenOptions = emptyObject
): ExecutorPlugin {
  const { delay = 0 } = options;

  return executor => {
    let timer: NodeJS.Timeout | undefined;
    let shouldAbort = false;

    const unsubscribe = observable.subscribe(isAborted => {
      if (!isAborted) {
        clearTimeout(timer);
        timer = undefined;
        shouldAbort = false;
        return;
      }

      if (shouldAbort || timer !== undefined) {
        return;
      }

      timer = setTimeout(() => {
        timer = undefined;
        shouldAbort = true;
        executor.abort();
      }, delay);
    });

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          if (shouldAbort) {
            executor.abort();
          }
          break;

        case 'detached':
          clearTimeout(timer);
          unsubscribe();
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'abortWhen',
        options: { observable, delay },
      } satisfies PluginConfiguredPayload,
    });
  };
}

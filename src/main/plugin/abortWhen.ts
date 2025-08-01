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
   * The minimum delay (in milliseconds) after the observable emits `true` and aborting the executor — unless
   * the executor is settled or the observable emits `false`.
   *
   * @default 0
   */
  delay?: number;

  /**
   * If `true`, every new task is immediately aborted if the last value emitted by the observable was `true` and
   * the {@link delay} has expired.
   *
   * @default false
   */
  isSustained?: boolean;
}

/**
 * Aborts the pending task if the observable emits `true`.
 *
 * @param observable The observable that trigger the abort of the executor.
 * @param options Abort options.
 */
export default function abortWhen(
  observable: Observable<boolean>,
  options: AbortWhenOptions = emptyObject
): ExecutorPlugin {
  const { delay = 0, isSustained = false } = options;

  return executor => {
    let timer: ReturnType<typeof setTimeout>;
    let shouldAbort = false;

    const unsubscribe = observable.subscribe(isAborted => {
      clearTimeout(timer);

      if (!isAborted) {
        shouldAbort = false;
        return;
      }

      timer = setTimeout(() => {
        shouldAbort = true;
        executor.abort();
      }, delay);
    });

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          if (shouldAbort && isSustained) {
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
      payload: { type: 'abortWhen', options: { observable, delay, isSustained } } satisfies PluginConfiguredPayload,
    });
  };
}

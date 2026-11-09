/**
 * The plugin that aborts the pending task if the observable emits `true`.
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

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.ts';

/**
 * Options of the {@link abortWhen} plugin.
 */
export interface AbortWhenOptions {
  /**
   * The minimum delay (in milliseconds) between the observable emitting `true` and the abort. If the observable
   * emits `false` during this delay, the task isn't aborted.
   *
   * @default 0
   */
  delay?: number;

  /**
   * If `true`, then after the {@link delay} has passed, every new task is aborted as soon as it starts, until the
   * observable emits `false`.
   *
   * @default false
   */
  isSustained?: boolean;
}

/**
 * Aborts the pending task if the observable emits `true`.
 *
 * @param observable The observable that triggers the abort.
 * @param options Plugin options.
 */
export default function abortWhen(observable: Observable<boolean>, options: AbortWhenOptions = {}): ExecutorPlugin {
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

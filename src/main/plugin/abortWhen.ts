/**
 * The plugin that aborts the pending task if the observable pushes `false`.
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import windowFocused from 'react-executor/observable/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(windowFocused)
 * ]);
 * ```
 *
 * @module plugin/abortWhen
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types';

/**
 * Aborts the pending task if the observable pushes `false`.
 *
 * @param observable The observable that trigger the abort of the executor.
 * @param delay The timeout in milliseconds after `false` is pushed by observer before the executor is aborted.
 */
export default function abortWhen(observable: Observable<boolean>, delay = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout | undefined;
    let shouldAbort = false;

    const unsubscribe = observable.subscribe(isEnabled => {
      if (isEnabled) {
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

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'abortWhen',
      options: { observable, delay },
    });
  };
}

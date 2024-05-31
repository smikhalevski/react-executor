/**
 * The plugin that retries the latest task if the observable pushes `false` and then `true`.
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import windowFocused from 'react-executor/observable/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(windowFocused)
 * ]);
 * ```
 *
 * @module plugin/retryWhen
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types';

/**
 * Retries the latest task if the observable pushes `false` and then `true`.
 *
 * @param observable The observable that triggers the retry of the latest task.
 * @param ms The timeout in milliseconds that should pass after `false` was pushed to retry the executor when `true` is
 * pushed.
 */
export default function retryWhen(observable: Observable<boolean>, ms = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout | undefined;
    let shouldRetry = false;

    const unsubscribe = observable.subscribe(isEnabled => {
      if (isEnabled) {
        clearTimeout(timer);
        timer = undefined;

        if (shouldRetry && executor.isActive) {
          shouldRetry = false;
          executor.retry();
        }
        return;
      }

      if (shouldRetry || timer !== undefined) {
        return;
      }

      timer = setTimeout(() => {
        timer = undefined;
        shouldRetry = true;
      }, ms);
    });

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
          if (shouldRetry) {
            shouldRetry = false;
            executor.retry();
          }
          break;

        case 'fulfilled':
        case 'rejected':
          clearTimeout(timer);
          timer = undefined;
          break;

        case 'detached':
          unsubscribe();
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'retryWhen',
      options: { observable, ms },
    });
  };
}

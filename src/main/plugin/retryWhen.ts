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
import { emptyObject } from '../utils';

/**
 * Options of the {@link retryWhen} plugin.
 */
export interface RetryWhenOptions {
  /**
   * The timeout in milliseconds that should pass after `false` was pushed by the observable to retry the executor
   * when the next `true` is pushed.
   *
   * @default 0
   */
  delay?: number;

  /**
   * If `true` then executor is retried even if it isn't {@link Executor.isActive active}.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the latest task if the observable pushes `false` and then `true`.
 *
 * @param observable The observable that triggers the retry of the latest task.
 * @param options Retry options.
 */
export default function retryWhen(
  observable: Observable<boolean>,
  options: RetryWhenOptions = emptyObject
): ExecutorPlugin {
  const { delay = 0, isEager = false } = options;

  return executor => {
    let timer: NodeJS.Timeout | undefined;
    let shouldRetry = false;

    const unsubscribe = observable.subscribe(isEnabled => {
      if (isEnabled) {
        clearTimeout(timer);
        timer = undefined;

        if (shouldRetry && (isEager || executor.isActive)) {
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
      }, delay);
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
          clearTimeout(timer);
          unsubscribe();
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'retryWhen',
      options: { observable, delay, isEager },
    });
  };
}

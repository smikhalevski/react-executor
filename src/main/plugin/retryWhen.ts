/**
 * The plugin that retries the latest task if the observable emits `true`.
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import windowFocused from 'react-executor/observable/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(windowFocused),
 * ]);
 * ```
 *
 * @module plugin/retryWhen
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link retryWhen} plugin.
 */
export interface RetryWhenOptions {
  /**
   * The minimum delay (in milliseconds) after the observable emits `true` and retrying the executor — unless
   * the observable emits `false`.
   *
   * @default 0
   */
  delay?: number;

  /**
   * If `true` then executor is retried even if it isn't active.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the latest task if the observable emits `true`.
 *
 * **NOte:** If executor isn't active and retry isn't {@link RetryWhenOptions.isEager eager} then the task is retried
 * after the executor becomes active.
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
    let timer: ReturnType<typeof setTimeout>;
    let shouldRetry = false;

    const unsubscribe = observable.subscribe(isRetried => {
      clearTimeout(timer);

      if (!isRetried || executor.isPending) {
        shouldRetry = false;
        return;
      }

      timer = setTimeout(() => {
        if (isEager || executor.isActive) {
          shouldRetry = false;
          executor.retry();
        } else {
          shouldRetry = true;
        }
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

        case 'pending':
        case 'fulfilled':
        case 'rejected':
          clearTimeout(timer);
          shouldRetry = false;
          break;

        case 'detached':
          clearTimeout(timer);
          unsubscribe();
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'retryWhen', options: { observable, delay, isEager } } satisfies PluginConfiguredPayload,
    });
  };
}

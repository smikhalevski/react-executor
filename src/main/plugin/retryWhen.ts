/**
 * The plugin that retries the latest task when the observable switches from `false` to `true`.
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

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.ts';

/**
 * Options of the {@link retryWhen} plugin.
 */
export interface RetryWhenOptions {
  /**
   * The minimum delay (in milliseconds) between the observable switching to `true` and the retry. If the
   * observable emits `false` during this delay, the task isn't retried.
   *
   * @default 0
   */
  delay?: number;

  /**
   * If `true`, the executor is retried even if it isn't {@link react-executor!Executor.isActive active}.
   *
   * @default false
   */
  isEager?: boolean;
}

/**
 * Retries the latest task when the observable switches from `false` to `true`. Repeated `true` values, including
 * the first value if it is `true`, don't trigger a retry.
 *
 * If the executor isn't active and the retry isn't {@link RetryWhenOptions.isEager eager}, the task is retried
 * after the executor is activated.
 *
 * @param observable The observable that triggers the retry.
 * @param options Plugin options.
 */
export default function retryWhen(observable: Observable<boolean>, options: RetryWhenOptions = {}): ExecutorPlugin {
  const { delay = 0, isEager = false } = options;

  return executor => {
    let timer: ReturnType<typeof setTimeout>;
    let canRetry = false;
    let shouldRetry = false;

    const unsubscribe = observable.subscribe(isRetried => {
      if (!isRetried) {
        clearTimeout(timer);
        canRetry = true;
        shouldRetry = false;
        return;
      }

      if (!canRetry) {
        // The observable didn't switch from false to true
        return;
      }

      canRetry = false;

      if (executor.isPending) {
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

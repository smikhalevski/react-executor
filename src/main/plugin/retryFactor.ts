/**
 * The plugin that retries the latest task if the factor was disabled and then enabled again.
 *
 * ```ts
 * import retryFactor from 'react-executor/plugin/retryFactor';
 * import windowFocused from 'react-executor/factor/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryFactor(windowFocused)
 * ]);
 * ```
 *
 * @module plugin/retryFactor
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types';

/**
 * Retries the latest task if the factor was disabled and then enabled again.
 *
 * @param factor The factor that must be disabled and enabled again.
 * @param ms The timeout in milliseconds that the factor must stay disabled to schedule the retry of the latest task.
 */
export default function retryFactor(factor: Observable<boolean>, ms = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout | undefined;
    let shouldRetry = false;

    const listener = (isEnabled: boolean) => {
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
    };

    if (factor.get !== undefined) {
      listener(factor.get());
    }

    const unsubscribe = factor.subscribe(listener);

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
      type: 'retryFactor',
      options: { factor, ms },
    });
  };
}

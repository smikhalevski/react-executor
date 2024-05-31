/**
 * The plugin that aborts the pending task if the factor is `false`.
 *
 * ```ts
 * import abortFactor from 'react-executor/plugin/abortFactor';
 * import windowFocused from 'react-executor/factor/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortFactor(windowFocused)
 * ]);
 * ```
 *
 * @module plugin/abortFactor
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types';

/**
 * Aborts the pending task if the factor is `false`.
 *
 * @param factor The factor that must become `false` to abort the executor.
 * @param ms The timeout in milliseconds that the factor must stay disabled to abort the executor.
 */
export default function abortFactor(factor: Observable<boolean>, ms = 0): ExecutorPlugin {
  return executor => {
    let timer: NodeJS.Timeout | undefined;
    let shouldAbort = false;

    const unsubscribe = factor.subscribe(isEnabled => {
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
      }, ms);
    });

    executor.subscribe(event => {
      switch (event.type) {
        case 'pending':
          if (shouldAbort) {
            executor.abort();
          }
          break;

        case 'detached':
          unsubscribe();
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'abortFactor',
      options: { factor, ms },
    });
  };
}

/**
 * The plugin that invalidates the executor result when the observable switches from `false` to `true`.
 *
 * ```ts
 * import invalidateWhen from 'react-executor/plugin/invalidateWhen';
 * import windowFocused from 'react-executor/observable/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   invalidateWhen(windowFocused),
 * ]);
 * ```
 *
 * @module plugin/invalidateWhen
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.js';

/**
 * Options of the {@link invalidateWhen} plugin.
 */
export interface InvalidateWhenOptions {
  /**
   * The minimum time (in milliseconds) that the observable must stay `false` before its switch to `true`
   * invalidates the executor.
   *
   * @default 0
   */
  delay?: number;
}

/**
 * Invalidates the executor result when the observable switches from `false` to `true`.
 *
 * @param observable The observable that triggers the invalidation.
 * @param options Plugin options.
 */
export default function invalidateWhen(
  observable: Observable<boolean>,
  options: InvalidateWhenOptions = {}
): ExecutorPlugin {
  const { delay = 0 } = options;

  return executor => {
    let startedAt = 0;

    const unsubscribe = observable.subscribe(isInvalid => {
      if (!isInvalid) {
        startedAt = startedAt !== 0 ? startedAt : Date.now();
        return;
      }

      if (startedAt !== 0 && Date.now() - startedAt >= delay) {
        executor.invalidate();
      }

      startedAt = 0;
    });

    executor.subscribe(event => {
      if (event.type === 'detached') {
        unsubscribe();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'invalidateWhen', options: { observable, delay } } satisfies PluginConfiguredPayload,
    });
  };
}

/**
 * The plugin that invalidates the settled executor result when the observable emits `true`.
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
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link invalidateWhen} plugin.
 */
export interface InvalidateWhenOptions {
  /**
   * The minimum delay (in milliseconds) after the observable emits `false` before the executor is invalidated when
   * the observable emits `true`.
   *
   * @default 0
   */
  delay?: number;
}

/**
 * Invalidates the settled executor result when the observable emits `true`.
 *
 * @param observable The observable that triggers the invalidation of the executor result.
 * @param options Invalidate options.
 */
export default function invalidateWhen(
  observable: Observable<boolean>,
  options: InvalidateWhenOptions = emptyObject
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

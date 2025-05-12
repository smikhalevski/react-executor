/**
 * The plugin that resolves the executor with values pushed by an observable.
 *
 * ```ts
 * import resolveBy from 'react-executor/plugin/resolveBy';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   resolveBy(observable)
 * ]);
 * ```
 *
 * @module plugin/resolveBy
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.js';

/**
 * Resolves the executor with values pushed by an observable.
 *
 * @param observable The observable that pushes values.
 * @template Value The value stored by the executor.
 */
export default function resolveBy<Value>(observable: Observable<PromiseLike<Value> | Value>): ExecutorPlugin<Value> {
  return executor => {
    const unsubscribe = observable.subscribe(value => executor.resolve(value));

    executor.subscribe(event => {
      if (event.type === 'detached') {
        unsubscribe();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'resolveBy',
        options: { observable },
      } satisfies PluginConfiguredPayload,
    });
  };
}

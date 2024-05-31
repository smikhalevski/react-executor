/**
 * The plugin that resolves the executor with values pushed by an observable.
 *
 * ```ts
 * import resolveWhen from 'react-executor/plugin/resolveWhen';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   resolveWhen(observable)
 * ]);
 * ```
 *
 * @module plugin/resolveWhen
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types';

/**
 * Resolves the executor with values pushed by an observable.
 *
 * @param observable The observable that pushes values.
 * @template Value The value stored by the executor.
 */
export default function resolveWhen<Value>(observable: Observable<PromiseLike<Value> | Value>): ExecutorPlugin<Value> {
  return executor => {
    const unsubscribe = observable.subscribe(value => {
      executor.resolve(value);
    });

    executor.subscribe(event => {
      if (event.type === 'detached') {
        unsubscribe();
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'resolveWhen',
      options: { observable },
    });
  };
}

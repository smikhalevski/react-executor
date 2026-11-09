/**
 * The plugin that resolves the executor with values emitted by an observable.
 *
 * ```ts
 * import resolveBy from 'react-executor/plugin/resolveBy';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   resolveBy(observable),
 * ]);
 * ```
 *
 * @module plugin/resolveBy
 */

import type { ExecutorPlugin, Observable, PluginConfiguredPayload } from '../types.ts';

/**
 * Resolves the executor with values emitted by an observable. If the observable emits a promise, the executor is
 * resolved with its result.
 *
 * @param observable The observable that emits values or promises.
 * @template Value The value stored by the executor.
 */
export default function resolveBy<Value>(observable: Observable<PromiseLike<Value> | Value>): ExecutorPlugin<Value> {
  return executor => {
    const unsubscribe = observable.subscribe(executor.resolve);

    executor.subscribe(event => {
      if (event.type === 'detached') {
        unsubscribe();
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'resolveBy', options: { observable } } satisfies PluginConfiguredPayload,
    });
  };
}

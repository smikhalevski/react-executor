import type { ExecutorPlugin } from '../types';

/**
 * Invalidates the executor if a dependency is fulfilled or invalidated.
 */
export default function dependencyPlugin(keys: Array<RegExp | string>): ExecutorPlugin {
  return executor =>
    executor.manager.subscribe(event => {
      const targetKey = event.target.key;

      if (
        (event.type === 'invalidated' || event.type === 'fulfilled') &&
        keys.some(key => (typeof key === 'string' ? targetKey === key : key.test(targetKey)))
      ) {
        executor.invalidate();
      }
    });
}

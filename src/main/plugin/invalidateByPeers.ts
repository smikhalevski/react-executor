import type { ExecutorPlugin } from '../types';

/**
 * Invalidates the settled executor result if another executor with a matching is fulfilled or invalidated.
 *
 * @param keys The array of executor keys and key patterns.
 */
export default function invalidateByPeers(keys: Array<RegExp | string>): ExecutorPlugin {
  return executor => {
    const unsubscribe = executor.manager.subscribe(event => {
      const targetKey = event.target.key;

      if (
        (event.type === 'invalidated' || event.type === 'fulfilled') &&
        keys.some(key => (typeof key === 'string' ? key === targetKey : key.test(targetKey)))
      ) {
        executor.invalidate();
      }
    });

    executor.subscribe(event => {
      if (event.type === 'disposed') {
        unsubscribe();
      }
    });
  };
}

import type { ExecutorPlugin } from '../types';

/**
 * Invalidates the settled executor result if another executor with a matching key is fulfilled or invalidated.
 *
 * @param keys The array of executor keys and key patterns.
 */
export default function invalidateByPeers(keys: Array<RegExp | string>): ExecutorPlugin {
  return executor => {
    const unsubscribe = executor.manager.subscribe(event => {
      const peerKey = event.target.key;

      if (
        (event.type === 'invalidated' || event.type === 'fulfilled') &&
        keys.some(key => (typeof key === 'string' ? key === peerKey : key.test(peerKey)))
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

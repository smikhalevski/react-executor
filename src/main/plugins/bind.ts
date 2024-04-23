import type { ExecutorPlugin } from '../types';

/**
 * Binds all executor methods to the instance.
 */
export default function bindPlugin(): ExecutorPlugin {
  return (executor: any) => {
    const { prototype } = executor.constructor.prototype;

    for (const key in prototype) {
      if (typeof prototype[key] === 'function') {
        executor[key] = prototype[key].bind(executor);
      }
    }
  };
}

import type { Plugin } from '../types';

/**
 * Binds all executor methods to the instance.
 */
export default function bindPlugin(): Plugin {
  return (executor: any) => {
    const { prototype } = executor.constructor.prototype;

    for (const key in prototype) {
      if (typeof prototype[key] === 'function') {
        executor[key] = prototype[key].bind(executor);
      }
    }
  };
}

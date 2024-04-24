import type { ExecutorPlugin } from '../types';

/**
 * Binds all executor methods to the instance.
 */
export default function bindAll(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = (executor: any) => {
  const { prototype } = executor.constructor.prototype;

  for (const key in prototype) {
    if (typeof prototype[key] === 'function') {
      executor[key] = prototype[key].bind(executor);
    }
  }
};

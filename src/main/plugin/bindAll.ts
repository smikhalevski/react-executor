/**
 * The plugin that binds all executor methods to the instance.
 *
 * ```ts
 * import bindAll from 'react-executor/plugin/bindAll';
 *
 * const executor = useExecutor('test', 42, [bindAll()]);
 * ```
 *
 * @module plugin/bindAll
 */

import type { ExecutorPlugin } from '../types';

/**
 * Binds all executor methods to the instance.
 */
export default function bindAll(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = (executor: any) => {
  const { prototype } = executor.constructor;

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (typeof prototype[key] === 'function') {
      executor[key] = prototype[key].bind(executor);
    }
  }
};

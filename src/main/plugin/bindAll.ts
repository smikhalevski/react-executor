/**
 * The plugin that binds all methods to the executor instance.
 *
 * ```ts
 * import bindAll from 'react-executor/plugin/bindAll';
 *
 * const executor = useExecutor('test', 42, [bindAll()]);
 * ```
 *
 * @module plugin/bindAll
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.js';

/**
 * Binds all methods to the executor instance.
 */
export default function bindAll(): ExecutorPlugin {
  return plugin;
}

const plugin: ExecutorPlugin = executor => {
  const { prototype } = executor.constructor;

  for (const key of Object.getOwnPropertyNames(prototype)) {
    if (typeof prototype[key] === 'function') {
      (executor as any)[key] = prototype[key].bind(executor);
    }
  }

  executor.publish({
    type: 'plugin_configured',
    payload: {
      type: 'bindAll',
    } satisfies PluginConfiguredPayload,
  });
};

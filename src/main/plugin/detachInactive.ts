/**
 * The plugin that detaches an inactive executor after a timeout elapses.
 *
 * ```ts
 * import detachInactive from 'react-executor/plugin/detachInactive';
 *
 * const executor = useExecutor('test', 42, [detachInactive()]);
 * ```
 *
 * @module plugin/detachInactive
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types';

/**
 * Detaches an inactive executor after a timeout elapses.
 *
 * @param ms The timeout in milliseconds after which the executor is detached.
 */
export default function detachInactive(ms = 5_000): ExecutorPlugin {
  return executor => {
    let timer = setTimeout(() => executor.manager.detach(executor.key), ms);

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          timer = setTimeout(() => executor.manager.detach(executor.key), ms);
          break;

        case 'activated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'detachInactive',
      options: { ms },
    });
  };
}

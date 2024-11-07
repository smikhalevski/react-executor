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
 * @param delay The timeout in milliseconds after which the executor is detached.
 */
export default function detachInactive(
  delay: { delayBeforeActivation: number; delayAfterDeactivation: number } | number = 5_000
): ExecutorPlugin {
  const { delayBeforeActivation, delayAfterDeactivation } =
    typeof delay === 'number' ? { delayBeforeActivation: delay, delayAfterDeactivation: delay } : delay;

  return executor => {
    let timer: NodeJS.Timeout;

    if (delayBeforeActivation !== -1) {
      timer = setTimeout(() => executor.manager.detach(executor.key), delayBeforeActivation);
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          if (delayAfterDeactivation !== -1) {
            timer = setTimeout(() => executor.manager.detach(executor.key), delayAfterDeactivation);
          }
          break;

        case 'activated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish<PluginConfiguredPayload>('plugin_configured', {
      type: 'detachInactive',
      options: { delayBeforeActivation, delayAfterDeactivation },
    });
  };
}

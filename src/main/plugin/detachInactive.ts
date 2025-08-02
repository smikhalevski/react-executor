/**
 * The plugin that detaches an executor that isn't active after a delay.
 *
 * ```ts
 * import detachInactive from 'react-executor/plugin/detachInactive';
 *
 * const executor = useExecutor('test', 42, [
 *   detachInactive({ delayBeforeActivated: 5_000 }),
 * ]);
 * ```
 *
 * @module plugin/detachInactive
 */

import type { ExecutorPlugin, PluginConfiguredPayload } from '../types.js';

/**
 * Options of the {@link detachInactive} plugin.
 */
export interface DetachInactiveOptions {
  /**
   * The maximum delay (in milliseconds) allowed between executor creation and activation before it is detached.
   *
   * Use this when creating an executor prematurely and unsure if it will be used.
   *
   * By default, executor isn't detached if it wasn't activated.
   */
  delayBeforeActivated?: number;

  /**
   * The minimum delay (in milliseconds) between executor deactivation and detachment. If the executor is reactivated
   * during this delay, it won't be detached.
   *
   * By default, executor isn't detached if it was deactivated.
   */
  delayAfterDeactivated?: number;
}

/**
 * Detaches an executor that isn't active after a delay.
 *
 * @param options Detach options.
 */
export default function detachInactive(options: DetachInactiveOptions): ExecutorPlugin {
  const { delayBeforeActivated, delayAfterDeactivated } = options;

  return executor => {
    let timer: ReturnType<typeof setTimeout>;

    const detach = () => executor.manager.detach(executor.key);

    if (delayBeforeActivated !== undefined) {
      timer = setTimeout(detach, delayBeforeActivated);
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          if (delayAfterDeactivated !== undefined) {
            timer = setTimeout(detach, delayAfterDeactivated);
          }
          break;

        case 'activated':
        case 'detached':
          clearTimeout(timer);
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'detachInactive',
        options: { delayBeforeActivated, delayAfterDeactivated },
      } satisfies PluginConfiguredPayload,
    });
  };
}

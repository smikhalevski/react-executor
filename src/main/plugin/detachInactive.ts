/**
 * The plugin that detaches an executor that isn't active after a delay.
 *
 * ```ts
 * import detachInactive from 'react-executor/plugin/detachInactive';
 *
 * const executor = useExecutor('test', 42, [
 *   detachInactive({ delayBeforeActivation: 5_000 })
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
   * The delay in milliseconds after which the executor is detached if it wasn't activated after being attached.
   *
   * Use this if you create an executor prematurely and not sure whether is will be used or not.
   *
   * By default, executor isn't detached if it wasn't activated.
   */
  delayBeforeActivation?: number;

  /**
   * The delay in milliseconds after which the executor is detached after being deactivated. If executor is activated
   * during this timeout, then detach is prevented.
   *
   * By default, executor isn't detached if it was deactivated.
   */
  delayAfterDeactivation?: number;
}

/**
 * Detaches an executor that isn't active after a delay.
 *
 * @param options Detach options.
 */
export default function detachInactive(options: DetachInactiveOptions): ExecutorPlugin {
  const { delayBeforeActivation, delayAfterDeactivation } = options;

  return executor => {
    let timer: NodeJS.Timeout;

    if (delayBeforeActivation !== undefined) {
      timer = setTimeout(() => executor.manager.detach(executor.key), delayBeforeActivation);
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'deactivated':
          clearTimeout(timer);

          if (delayAfterDeactivation !== undefined) {
            timer = setTimeout(() => executor.manager.detach(executor.key), delayAfterDeactivation);
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
        options: { delayBeforeActivation, delayAfterDeactivation },
      } satisfies PluginConfiguredPayload,
    });
  };
}

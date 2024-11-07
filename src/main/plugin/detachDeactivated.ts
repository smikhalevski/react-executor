/**
 * The plugin that detaches a deactivated executor after a timeout elapses. The executor must be activated at least once
 * for this plugin to have an effect.
 *
 * ```ts
 * import detachDeactivated from 'react-executor/plugin/detachDeactivated';
 *
 * const executor = useExecutor('test', 42, [detachDeactivated()]);
 * ```
 *
 * @module plugin/detachDeactivated
 */

import type { ExecutorPlugin } from '../types';
import detachInactive from './detachInactive';

/**
 * Detaches a deactivated executor after a timeout elapses. The executor must be activated at least once for this plugin
 * to have an effect.
 *
 * @param delay The timeout in milliseconds after which the executor is detached.
 */
export default function detachDeactivated(delay = 5_000): ExecutorPlugin {
  return detachInactive({ delayBeforeActivation: -1, delayAfterDeactivation: delay });
}

/**
 * The plugin that detaches a deactivated executor after a delay. The executor must be activated at least once
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

import type { ExecutorPlugin } from '../types.js';
import detachInactive from './detachInactive.js';
import { emptyObject } from '../utils.js';

/**
 * Options of the {@link detachDeactivated} plugin.
 */
export interface DetachDeactivatedOptions {
  /**
   * The minimum delay (in milliseconds) between executor deactivation and detachment. If the executor is reactivated
   * during this delay, it won't be detached.
   *
   * @default 5_000
   */
  delay?: number;
}

/**
 * Detaches a deactivated executor after a {@link DetachDeactivatedOptions.delay delay}. The executor must be activated
 * at least once for this plugin to have an effect.
 *
 * @param options Detach options.
 * @see {@link detachInactive}
 */
export default function detachDeactivated(options: DetachDeactivatedOptions = emptyObject): ExecutorPlugin {
  const { delay = 5_000 } = options;

  return detachInactive({ delayAfterDeactivated: delay });
}

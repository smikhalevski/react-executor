/**
 * The observable that emits `true` when
 * [the device is disconnected from the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine),
 * and `false` when it is connected.
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import navigatorOffline from 'react-executor/observable/navigatorOffline';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(navigatorOffline),
 * ]);
 * ```
 *
 * @module observable/navigatorOffline
 */

import { negate } from '../utils.js';
import navigatorOnline from './navigatorOnline.js';

/**
 * The observable that emits `true` when
 * [the device is disconnected from the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine),
 * and `false` when it is connected.
 *
 * The current state is emitted to a listener right after it subscribes.
 */
const navigatorOffline = negate(navigatorOnline);

export default navigatorOffline;

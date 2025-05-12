/**
 * The observable that emits `true` if
 * [the device is disconnected from the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine),
 * and emits `false` if the device if connected to the network.
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import navigatorOffline from 'react-executor/observable/navigatorOffline';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(navigatorOffline)
 * ]);
 * ```
 *
 * @module observable/navigatorOffline
 */

import not from './not.js';
import navigatorOnline from './navigatorOnline.js';

/**
 * The observable that emits `true` if
 * [the device is disconnected from the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine),
 * and emits `false` if the device if connected to the network.
 */
const navigatorOffline = not(navigatorOnline);

export default navigatorOffline;

/**
 * The observable that emits `true` if
 * [the device is disconnected from the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
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

import not from './not';
import navigatorOnline from './navigatorOnline';

/**
 * The observable that emits `true` if
 * [the device is disconnected from the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
 */
const navigatorOffline = not(navigatorOnline);

export default navigatorOffline;

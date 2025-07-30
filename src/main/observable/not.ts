/**
 * The observable that inverses boolean values emitted by another observable.
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import navigatorOffline from 'react-executor/observable/navigatorOffline';
 * import not from 'react-executor/observable/not';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(not(navigatorOnline)),
 * ]);
 * ```
 *
 * @module observable/not
 */

import { Observable } from '../types.js';

/**
 * Returns the observable that inverses boolean values emitted by another observable.
 *
 * @param observable The observable to inverse.
 */
export default function not(observable: Observable<boolean>): Observable<boolean> {
  return {
    subscribe: listener => observable.subscribe(value => listener(!value)),
  };
}

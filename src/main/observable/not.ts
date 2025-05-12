import { Observable } from '../types.js';

/**
 * Returns the observable that inverses boolean values emitted by the observable.
 *
 * @param observable The observable to inverse.
 */
export default function not(observable: Observable<boolean>): Observable<boolean> {
  return {
    subscribe: listener => observable.subscribe(value => listener(!value)),
  };
}

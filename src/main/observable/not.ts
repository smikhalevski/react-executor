import { Observable } from '../types';

/**
 * Returns the observable that inverses boolean values emitted by {@link observable}.
 *
 * @param observable The observable to inverse.
 */
export default function not(observable: Observable<boolean>): Observable<boolean> {
  return {
    subscribe: listener => observable.subscribe(value => listener(!value)),
  };
}

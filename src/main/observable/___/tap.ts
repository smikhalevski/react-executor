import { Observable } from '../../types.js';

export function tap<T>(observable: Observable<T>, tapListener: (value: T) => void): Observable<T> {
  return {
    subscribe: listener => {
      const unsubscribe1 = observable.subscribe(tapListener);
      const unsubscribe2 = observable.subscribe(listener);

      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    },
  };
}

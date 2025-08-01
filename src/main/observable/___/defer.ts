import { Observable } from '../../types.js';

export function defer<T>(observable: Observable<T>, delay: number): Observable<T> {
  return {
    subscribe(listener) {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = observable.subscribe(value => {
        timer = setTimeout(listener, delay, value);
      });

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    },
  };
}

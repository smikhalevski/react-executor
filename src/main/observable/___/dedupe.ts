import { Observable } from '../../types.js';

export function dedupe<T>(
  observable: Observable<T>,
  equalityChecker: (prevValue: T, value: T) => boolean = Object.is
): Observable<T> {
  let hasValue = false;
  let prevValue: T | undefined;

  return {
    subscribe: listener =>
      observable.subscribe(value => {
        if (hasValue && equalityChecker(prevValue!, value)) {
          return;
        }

        hasValue = true;
        prevValue = value;
        listener(value);
      }),
  };
}

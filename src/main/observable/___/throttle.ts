import { Observable } from '../../types.js';

export function throttle<T>(observable: Observable<T>, delay: number, isLeading = false): Observable<T> {
  let isThrottling = false;
  let hasValue = false;
  let lastValue: T | undefined;

  return {
    subscribe(listener) {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = observable.subscribe(value => {
        lastValue = value;
        hasValue = true;

        if (isThrottling) {
          return;
        }

        if (isLeading) {
          lastValue = undefined;
          hasValue = false;
          listener(value);
        }

        isThrottling = true;

        timer = setTimeout(() => {
          isThrottling = false;

          if (!hasValue) {
            return;
          }

          const value = lastValue!;

          lastValue = undefined;
          hasValue = false;

          // lastValue must be cleaned up even if listener throws
          listener(value);
        }, delay);
      });

      return () => {
        // Clean up resources
        lastValue = undefined;

        clearTimeout(timer);
        unsubscribe();
      };
    },
  };
}

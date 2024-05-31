/**
 * Observable of the
 * [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import windowFocused from 'react-executor/factor/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(windowFocused)
 * ]);
 * ```
 *
 * @module factor/windowFocused
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types';
import { noop } from '../utils';

const pubSub = new PubSub<boolean>();

function publish() {
  pubSub.publish(typeof document === 'undefined' || document.visibilityState === 'visible');
}

/**
 * Observable of the
 * [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 */
const windowFocused: Observable<boolean> = {
  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('visibilitychange', publish, false);
      window.addEventListener('focus', publish, false);
    }

    const unsubscribe = pubSub.subscribe(listener);

    setTimeout(publish, 0);

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('visibilitychange', publish, false);
        window.removeEventListener('focus', publish, false);
      }
    };
  },
};

export default windowFocused;

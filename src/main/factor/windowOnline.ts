/**
 * Observable of the
 * [`navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import windowOnline from 'react-executor/factor/windowOnline';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(windowOnline)
 * ]);
 * ```
 *
 * @module factor/windowOnline
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types';
import { noop } from '../utils';

const pubSub = new PubSub<boolean>();

function publish() {
  pubSub.publish(typeof navigator === 'undefined' || navigator.onLine);
}

/**
 * Observable of the
 * [`navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
 */
const windowOnline: Observable<boolean> = {
  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('offline', publish, false);
      window.addEventListener('online', publish, false);
    }

    const unsubscribe = pubSub.subscribe(listener);

    setTimeout(publish, 0);

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('offline', publish, false);
        window.removeEventListener('online', publish, false);
      }
    };
  },
};

export default windowOnline;

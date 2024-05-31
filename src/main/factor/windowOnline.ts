/**
 * Observable of the
 * [`navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
 *
 * ```ts
 * import abortFactor from 'react-executor/plugin/abortFactor';
 * import windowOnline from 'react-executor/factor/windowOnline';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortFactor(windowOnline)
 * ]);
 * ```
 *
 * @module factor/windowOnline
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types';
import { noop } from '../utils';

const pubSub = new PubSub<boolean>();

function get() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function handleEvent() {
  pubSub.publish(get());
}

/**
 * Observable of the
 * [`navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine).
 */
const windowOnline: Observable<boolean> = {
  get,

  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('offline', handleEvent, false);
      window.addEventListener('online', handleEvent, false);
    }

    const unsubscribe = pubSub.subscribe(listener);

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('offline', handleEvent, false);
        window.removeEventListener('online', handleEvent, false);
      }
    };
  },
};

export default windowOnline;

/**
 * The observable that emits `true` if
 * [the device is _connected_ to the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine), and
 * emits `false` if the device is disconnected from the network.
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import navigatorOnline from 'react-executor/observable/navigatorOnline';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(navigatorOnline),
 * ]);
 * ```
 *
 * @module observable/navigatorOnline
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types.js';
import { noop } from '../utils.js';

const pubSub = new PubSub<boolean>();

function handleChange(): void {
  pubSub.publish(window.navigator.onLine);
}

/**
 * The observable that emits `true` if
 * [the device is _connected_ to the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine), and
 * emits `false` if the device is disconnected from the network.
 */
const navigatorOnline: Observable<boolean> = {
  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('offline', handleChange, false);
      window.addEventListener('online', handleChange, false);
    }

    const unsubscribe = pubSub.subscribe(listener);

    setTimeout(handleChange, 0);

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('offline', handleChange, false);
        window.removeEventListener('online', handleChange, false);
      }
    };
  },
};

export default navigatorOnline;

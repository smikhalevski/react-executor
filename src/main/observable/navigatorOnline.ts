/**
 * The observable that emits `true` when
 * [the device is connected to the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine), and
 * `false` when it is disconnected.
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
 * The observable that emits `true` when
 * [the device is connected to the network](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine), and
 * `false` when it is disconnected.
 *
 * The current state is emitted to a listener right after it subscribes.
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

    // Emit the current state to this listener only, other listeners have already received it
    const timer = setTimeout(() => listener(window.navigator.onLine), 0);

    return () => {
      clearTimeout(timer);
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('offline', handleChange, false);
        window.removeEventListener('online', handleChange, false);
      }
    };
  },
};

export default navigatorOnline;

/**
 * Observable of the
 * [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 *
 * ```ts
 * import abortFactor from 'react-executor/plugin/abortFactor';
 * import windowFocused from 'react-executor/factor/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortFactor(windowFocused)
 * ]);
 * ```
 *
 * @module factor/windowFocused
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types';
import { noop } from '../utils';

const pubSub = new PubSub<boolean>();

function get() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

function handleEvent() {
  pubSub.publish(get());
}

/**
 * Observable of the
 * [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 */
const windowFocused: Observable<boolean> = {
  get,

  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('visibilitychange', handleEvent, false);
      window.addEventListener('focus', handleEvent, false);
    }

    const unsubscribe = pubSub.subscribe(listener);

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('visibilitychange', handleEvent, false);
        window.removeEventListener('focus', handleEvent, false);
      }
    };
  },
};

export default windowFocused;

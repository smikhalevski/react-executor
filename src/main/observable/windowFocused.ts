/**
 * The observable that emits `true` when
 * [the window receives focus](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import windowFocused from 'react-executor/observable/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(windowFocused)
 * ]);
 * ```
 *
 * @module observable/windowFocused
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types';
import { noop } from '../utils';

const pubSub = new PubSub<boolean>();

function handleChange(): void {
  pubSub.publish(document.visibilityState === 'visible');
}

/**
 * The observable that emits `true` when
 * [the window receives focus](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 */
const windowFocused: Observable<boolean> = {
  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('visibilitychange', handleChange, false);
      window.addEventListener('focus', handleChange, false);
    }

    const unsubscribe = pubSub.subscribe(listener);

    setTimeout(handleChange, 0);

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('visibilitychange', handleChange, false);
        window.removeEventListener('focus', handleChange, false);
      }
    };
  },
};

export default windowFocused;

/**
 * The observable that emits `true` when
 * [the page becomes visible](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState) or the window
 * receives focus, and emits `false` when the page becomes hidden.
 *
 * ```ts
 * import retryWhen from 'react-executor/plugin/retryWhen';
 * import windowFocused from 'react-executor/observable/windowFocused';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   retryWhen(windowFocused),
 * ]);
 * ```
 *
 * @module observable/windowFocused
 */

import { PubSub } from 'parallel-universe';
import type { Observable } from '../types.js';
import { noop } from '../utils.js';

const pubSub = new PubSub<boolean>();

function isDocumentVisible(): boolean {
  return document.visibilityState === 'visible';
}

function handleChange(): void {
  pubSub.publish(isDocumentVisible());
}

/**
 * The observable that emits `true` when
 * [the page becomes visible](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState) or the window
 * receives focus, and emits `false` when the page becomes hidden.
 *
 * The current state is emitted to a listener right after it subscribes.
 */
const windowFocused: Observable<boolean> = {
  subscribe(listener) {
    if (typeof window === 'undefined') {
      return noop;
    }

    if (pubSub.listenerCount === 0) {
      window.addEventListener('visibilitychange', handleChange);
      window.addEventListener('focus', handleChange);
    }

    const unsubscribe = pubSub.subscribe(listener);

    // Emit the current state to this listener only, other listeners have already received it
    const timer = setTimeout(() => listener(isDocumentVisible()), 0);

    return () => {
      clearTimeout(timer);
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('visibilitychange', handleChange);
        window.removeEventListener('focus', handleChange);
      }
    };
  },
};

export default windowFocused;

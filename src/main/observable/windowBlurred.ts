/**
 * The observable that emits `true` when
 * [the window looses focus](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import windowBlurred from 'react-executor/observable/windowBlurred';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(windowBlurred)
 * ]);
 * ```
 *
 * @module observable/windowBlurred
 */

import not from './not';
import windowFocused from './windowFocused';

/**
 * The observable that emits `true` when
 * [the window looses focus](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState).
 */
const windowBlurred = not(windowFocused);

export default windowBlurred;

/**
 * The observable that emits `true` when
 * [the window loses focus](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState), and emits
 * `false` when the window receives focus.
 *
 * ```ts
 * import abortWhen from 'react-executor/plugin/abortWhen';
 * import windowBlurred from 'react-executor/observable/windowBlurred';
 *
 * const executor = useExecutor('test', heavyTask, [
 *   abortWhen(windowBlurred),
 * ]);
 * ```
 *
 * @module observable/windowBlurred
 */

import windowFocused from './windowFocused.js';
import { negate } from '../utils.js';

/**
 * The observable that emits `true` when
 * [the window loses focus](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState), and emits
 * `false` when the window receives focus.
 */
const windowBlurred = negate(windowFocused);

export default windowBlurred;

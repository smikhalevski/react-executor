/**
 * The observable that emits `true` when
 * [the page becomes hidden](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState), and `false`
 * when the page becomes visible or the window receives focus.
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

import { negate } from '../utils.ts';
import windowFocused from './windowFocused.ts';

/**
 * The observable that emits `true` when
 * [the page becomes hidden](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState), and `false`
 * when the page becomes visible or the window receives focus.
 *
 * The current state is emitted to a listener right after it subscribes.
 */
const windowBlurred = negate(windowFocused);

export default windowBlurred;

/**
 * @vitest-environment jsdom
 */

import { expect, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import windowFocused from '../../main/observable/windowFocused.js';

vi.useFakeTimers();

test('invokes listener after subscribe', () => {
  const listenerMock = vi.fn();

  windowFocused.subscribe(listenerMock);

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
});

test('invokes listener when visibilitychange event if dispatched', () => {
  const listenerMock = vi.fn();

  windowFocused.subscribe(listenerMock);

  vi.runAllTimers();

  fireEvent(window, new Event('visibilitychange'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

test('invokes listener when focus event if dispatched', () => {
  const listenerMock = vi.fn();

  windowFocused.subscribe(listenerMock);

  vi.runAllTimers();

  fireEvent(window, new Event('focus'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

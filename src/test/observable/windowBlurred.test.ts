// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import windowBlurred from '../../main/observable/windowBlurred.ts';

vi.useFakeTimers();

afterEach(() => {
  vi.restoreAllMocks();
});

test('invokes listener with true when the page becomes hidden', () => {
  const listenerMock = vi.fn();

  onTestFinished(windowBlurred.subscribe(listenerMock));

  vi.runAllTimers();

  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

  fireEvent(window, new Event('visibilitychange'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, false);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

test('does not invoke listener after unsubscribe', () => {
  const listenerMock = vi.fn();

  const unsubscribe = windowBlurred.subscribe(listenerMock);

  unsubscribe();

  vi.runAllTimers();

  expect(listenerMock).not.toHaveBeenCalled();
});

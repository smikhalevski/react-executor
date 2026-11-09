// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import navigatorOffline from '../../main/observable/navigatorOffline.js';

vi.useFakeTimers();

afterEach(() => {
  vi.restoreAllMocks();
});

test('invokes listener with true when offline event is dispatched', () => {
  const listenerMock = vi.fn();

  onTestFinished(navigatorOffline.subscribe(listenerMock));

  vi.runAllTimers();

  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

  fireEvent(window, new Event('offline'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, false);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

test('does not invoke listener after unsubscribe', () => {
  const listenerMock = vi.fn();

  const unsubscribe = navigatorOffline.subscribe(listenerMock);

  unsubscribe();

  vi.runAllTimers();

  expect(listenerMock).not.toHaveBeenCalled();
});

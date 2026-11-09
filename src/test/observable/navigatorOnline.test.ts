// @vitest-environment jsdom
import { fireEvent } from '@testing-library/react';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';
import navigatorOnline from '../../main/observable/navigatorOnline.js';
import { noop } from '../../main/utils.js';

vi.useFakeTimers();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('invokes listener after subscribe', () => {
  const listenerMock = vi.fn();

  onTestFinished(navigatorOnline.subscribe(listenerMock));

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
});

test('does not invoke other listeners after subscribe', () => {
  const listenerMock = vi.fn();

  onTestFinished(navigatorOnline.subscribe(listenerMock));

  vi.runAllTimers();

  onTestFinished(navigatorOnline.subscribe(noop));

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(1);
});

test('invokes listener when offline event is dispatched', () => {
  const listenerMock = vi.fn();

  onTestFinished(navigatorOnline.subscribe(listenerMock));

  vi.runAllTimers();

  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

  fireEvent(window, new Event('offline'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  expect(listenerMock).toHaveBeenNthCalledWith(2, false);
});

test('invokes listener when online event is dispatched', () => {
  const listenerMock = vi.fn();

  onTestFinished(navigatorOnline.subscribe(listenerMock));

  vi.runAllTimers();

  fireEvent(window, new Event('online'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

test('does not invoke listener after unsubscribe', () => {
  const listenerMock = vi.fn();

  const unsubscribe = navigatorOnline.subscribe(listenerMock);

  unsubscribe();

  vi.runAllTimers();

  expect(listenerMock).not.toHaveBeenCalled();
});

test('invokes listener after another listener unsubscribes', () => {
  const listenerMock = vi.fn();

  const unsubscribe = navigatorOnline.subscribe(noop);

  onTestFinished(navigatorOnline.subscribe(listenerMock));

  vi.runAllTimers();

  unsubscribe();

  fireEvent(window, new Event('online'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
});

test('removes window event listeners when the last listener unsubscribes', () => {
  const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

  const unsubscribe = navigatorOnline.subscribe(noop);

  unsubscribe();

  expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
  expect(removeEventListenerSpy.mock.calls).toEqual(addEventListenerSpy.mock.calls);
});

test('does not invoke listener if window is undefined', () => {
  vi.stubGlobal('window', undefined);

  const listenerMock = vi.fn();

  const unsubscribe = navigatorOnline.subscribe(listenerMock);

  vi.runAllTimers();

  unsubscribe();

  expect(listenerMock).not.toHaveBeenCalled();
});

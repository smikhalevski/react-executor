/**
 * @vitest-environment jsdom
 */

import { expect, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import navigatorOnline from '../../main/observable/navigatorOnline.js';

vi.useFakeTimers();

test('invokes listener after subscribe', () => {
  const listenerMock = vi.fn();

  navigatorOnline.subscribe(listenerMock);

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
});

test('invokes listener when offline event if dispatched', () => {
  const listenerMock = vi.fn();

  navigatorOnline.subscribe(listenerMock);

  vi.runAllTimers();

  fireEvent(window, new Event('offline'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

test('invokes listener when online event if dispatched', () => {
  const listenerMock = vi.fn();

  navigatorOnline.subscribe(listenerMock);

  vi.runAllTimers();

  fireEvent(window, new Event('online'));

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

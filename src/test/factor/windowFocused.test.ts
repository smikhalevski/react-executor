import { fireEvent } from '@testing-library/react';
import windowFocused from '../../main/factor/windowFocused';

jest.useFakeTimers();

describe('windowFocused', () => {
  test('invokes listener after subscribe', () => {
    const listenerMock = jest.fn();

    windowFocused.subscribe(listenerMock);

    jest.runAllTimers();

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  });

  test('invokes listener when visibilitychange event if dispatched', () => {
    const listenerMock = jest.fn();

    windowFocused.subscribe(listenerMock);

    jest.runAllTimers();

    fireEvent(window, new Event('visibilitychange'));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, true);
    expect(listenerMock).toHaveBeenNthCalledWith(2, true);
  });

  test('invokes listener when focus event if dispatched', () => {
    const listenerMock = jest.fn();

    windowFocused.subscribe(listenerMock);

    jest.runAllTimers();

    fireEvent(window, new Event('focus'));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, true);
    expect(listenerMock).toHaveBeenNthCalledWith(2, true);
  });
});

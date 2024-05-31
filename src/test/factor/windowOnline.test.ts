import { fireEvent } from '@testing-library/react';
import windowOnline from '../../main/factor/windowOnline';

jest.useFakeTimers();

describe('windowOnline', () => {
  test('invokes listener after subscribe', () => {
    const listenerMock = jest.fn();

    windowOnline.subscribe(listenerMock);

    jest.runAllTimers();

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(listenerMock).toHaveBeenNthCalledWith(1, true);
  });

  test('invokes listener when offline event if dispatched', () => {
    const listenerMock = jest.fn();

    windowOnline.subscribe(listenerMock);

    jest.runAllTimers();

    fireEvent(window, new Event('offline'));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, true);
    expect(listenerMock).toHaveBeenNthCalledWith(2, true);
  });

  test('invokes listener when online event if dispatched', () => {
    const listenerMock = jest.fn();

    windowOnline.subscribe(listenerMock);

    jest.runAllTimers();

    fireEvent(window, new Event('online'));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, true);
    expect(listenerMock).toHaveBeenNthCalledWith(2, true);
  });
});

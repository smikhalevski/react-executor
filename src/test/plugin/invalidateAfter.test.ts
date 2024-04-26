import { ExecutorManager } from '../../main';
import invalidateAfter from '../../main/plugin/invalidateAfter';

jest.useFakeTimers();

describe('invalidateAfter', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('invalidates an executor after the timeout', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);
    executor.activate();
    executor.resolve('aaa');

    jest.runAllTimers();

    expect(executor.isStale).toBe(true);

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'invalidated', target: executor });
  });

  test('delays invalidation every time an executor is fulfilled', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);
    executor.activate();
    executor.resolve('aaa');

    jest.advanceTimersByTime(99);

    executor.resolve('bbb');

    jest.advanceTimersByTime(99);

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor });
  });
});

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

  test('invalidates the initial value', async () => {
    const manager = new ExecutorManager({
      initialState: [
        {
          key: 'xxx',
          isFulfilled: true,
          value: 111,
          reason: undefined,
          annotations: {},
          settledAt: 50,
          invalidatedAt: 0,
        },
      ],
    });

    const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);

    expect(executor.isInvalidated).toBe(true);
  });

  test('invalidates an executor after a timeout', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);
    executor.activate();
    executor.resolve('aaa');

    jest.runAllTimers();

    expect(executor.isInvalidated).toBe(true);

    expect(listenerMock).toHaveBeenCalledTimes(5);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'invalidateAfter', options: { ms: 100 } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'invalidated', target: executor, version: 2 });
  });

  test('delays invalidation every time an executor is fulfilled', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);
    executor.activate();
    executor.resolve('aaa');

    jest.advanceTimersByTime(99);

    executor.resolve('bbb');

    jest.advanceTimersByTime(99);

    expect(listenerMock).toHaveBeenCalledTimes(5);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'invalidateAfter', options: { ms: 100 } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'fulfilled', target: executor, version: 2 });
  });
});

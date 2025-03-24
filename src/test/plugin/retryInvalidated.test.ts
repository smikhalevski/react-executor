import { ExecutorManager } from '../../main';
import retryInvalidated from '../../main/plugin/retryInvalidated';

describe('retryInvalidated', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();
    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('retries the invalidated active executor', async () => {
    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
    const executor = manager.getOrCreate('xxx', taskMock, [retryInvalidated()]);

    executor.activate();

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('aaa');

    executor.invalidate();

    expect(executor.isPending).toBe(true);
    expect(executor.isInvalidated).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('bbb');

    expect(listenerMock).toHaveBeenCalledTimes(8);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'retryInvalidated', options: { isEager: false } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'activated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'fulfilled', target: executor, version: 2 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'invalidated', target: executor, version: 3 });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'pending', target: executor, version: 4 });
    expect(listenerMock).toHaveBeenNthCalledWith(8, { type: 'fulfilled', target: executor, version: 5 });
  });

  test('retries the activated and invalidated executor', async () => {
    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
    const executor = manager.getOrCreate('xxx', taskMock, [retryInvalidated()]);

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('aaa');

    executor.invalidate();
    executor.activate();

    expect(executor.isPending).toBe(true);
    expect(executor.isInvalidated).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('bbb');

    expect(listenerMock).toHaveBeenCalledTimes(8);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'retryInvalidated', options: { isEager: false } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 2 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'invalidated', target: executor, version: 3 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'activated', target: executor, version: 3 });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'pending', target: executor, version: 4 });
    expect(listenerMock).toHaveBeenNthCalledWith(8, { type: 'fulfilled', target: executor, version: 5 });
  });
});

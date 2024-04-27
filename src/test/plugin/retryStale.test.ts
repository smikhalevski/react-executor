import { ExecutorManager } from '../../main';
import retryStale from '../../main/plugin/retryStale';

describe('retryStale', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();
    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('retries the invalidated active executor', async () => {
    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
    const executor = manager.getOrCreate('xxx', taskMock, [retryStale()]);

    executor.activate();

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isStale).toBe(false);
    expect(executor.value).toBe('aaa');

    executor.invalidate();

    expect(executor.isPending).toBe(true);
    expect(executor.isStale).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isStale).toBe(false);
    expect(executor.value).toBe('bbb');

    expect(listenerMock).toHaveBeenCalledTimes(7);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'pending', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'pending', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'invalidated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'fulfilled', target: executor });
  });

  test('retries the activated stale executor', async () => {
    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
    const executor = manager.getOrCreate('xxx', taskMock, [retryStale()]);

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isStale).toBe(false);
    expect(executor.value).toBe('aaa');

    executor.invalidate();
    executor.activate();

    expect(executor.isPending).toBe(true);
    expect(executor.isStale).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isStale).toBe(false);
    expect(executor.value).toBe('bbb');

    expect(listenerMock).toHaveBeenCalledTimes(7);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'pending', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'invalidated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'pending', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'fulfilled', target: executor });
  });
});

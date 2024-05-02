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

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('aaa');

    executor.invalidate();

    expect(executor.isPending).toBe(true);
    expect(executor.isInvalidated).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('bbb');

    expect(listenerMock).toHaveBeenCalledTimes(7);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 2 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'pending', target: executor, version: 4 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'invalidated', target: executor, version: 3 });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'fulfilled', target: executor, version: 5 });
  });

  test('retries the activated and invalidated executor', async () => {
    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
    const executor = manager.getOrCreate('xxx', taskMock, [retryInvalidated()]);

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('aaa');

    executor.invalidate();
    executor.activate();

    expect(executor.isPending).toBe(true);
    expect(executor.isInvalidated).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.isInvalidated).toBe(false);
    expect(executor.value).toBe('bbb');

    expect(listenerMock).toHaveBeenCalledTimes(7);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 2 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'invalidated', target: executor, version: 3 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'pending', target: executor, version: 4 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'activated', target: executor, version: 3 });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'fulfilled', target: executor, version: 5 });
  });
});
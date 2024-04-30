import { delay } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import disposeDeactivated from '../../main/plugin/disposeDeactivated';

describe('disposeDeactivated', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('disposes a deactivated executor', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [disposeDeactivated(0)]);
    const deactivate = executor.activate();
    const taskMock = jest.fn(_signal => delay(100, 'aaa'));
    const promise = executor.execute(taskMock);

    deactivate();

    await expect(promise).resolves.toBe('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(5);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'deactivated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'disposed', target: executor, version: 1 });
  });

  test('cancels deactivation of an activated executor', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [disposeDeactivated(0)]);
    const deactivate = executor.activate();
    const taskMock = jest.fn(_signal => delay(100, 'aaa'));
    const promise = executor.execute(taskMock);

    deactivate();
    executor.activate();

    await expect(promise).resolves.toBe('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(6);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'deactivated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'activated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'fulfilled', target: executor, version: 2 });
  });
});

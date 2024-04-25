import { delay } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import abortDeactivated from '../../main/plugin/abortDeactivated';

describe('abortDeactivated', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();
    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('aborts the pending execution', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [abortDeactivated()]);
    const deactivate = executor.activate();
    const taskMock = jest.fn(_signal => delay(100));
    const promise = executor.execute(taskMock);

    deactivate();

    await expect(promise).rejects.toEqual(new DOMException('The operation was aborted.', 'AbortError'));

    expect(taskMock.mock.calls[0][0].aborted).toBe(true);

    expect(listenerMock).toHaveBeenCalledTimes(5);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'deactivated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'aborted', target: executor });
  });

  test('does not abort if the executor was reactivated', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [abortDeactivated()]);
    const deactivate = executor.activate();
    const taskMock = jest.fn(_signal => delay(100, 'aaa'));
    const promise = executor.execute(taskMock);

    deactivate();
    executor.activate();

    await expect(promise).resolves.toBe('aaa');

    expect(taskMock.mock.calls[0][0].aborted).toBe(false);

    expect(listenerMock).toHaveBeenCalledTimes(6);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'deactivated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'activated', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'fulfilled', target: executor });
  });
});

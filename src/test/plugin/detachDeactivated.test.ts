import { describe, expect, test, beforeEach, vi, Mock } from 'vitest';
import { delay } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import detachDeactivated from '../../main/plugin/detachDeactivated';

describe('detachDeactivated', () => {
  let listenerMock: Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = vi.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('detaches a deactivated executor', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [detachDeactivated({ delay: 0 })]);
    const deactivate = executor.activate();
    const taskMock = vi.fn(_signal => delay(100, 'aaa'));
    const promise = executor.execute(taskMock);

    deactivate();

    await expect(promise).resolves.toBe('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(6);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'detachInactive', options: { delayAfterDeactivation: 0 } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'deactivated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'detached', target: executor, version: 1 });
  });

  test('cancels deactivation of an activated executor', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [detachDeactivated({ delay: 0 })]);
    const deactivate = executor.activate();
    const taskMock = vi.fn(_signal => delay(100, 'aaa'));
    const promise = executor.execute(taskMock);

    deactivate();
    executor.activate();

    await expect(promise).resolves.toBe('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(7);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'detachInactive', options: { delayAfterDeactivation: 0 } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'deactivated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'activated', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'fulfilled', target: executor, version: 2 });
  });
});

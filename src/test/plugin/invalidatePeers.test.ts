import { describe, expect, test, beforeEach, vi, Mock } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import invalidatePeers from '../../main/plugin/invalidatePeers.js';

vi.useFakeTimers();

describe('invalidatePeers', () => {
  let listenerMock: Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = vi.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('invalidates a peer executor', () => {
    const executor1 = manager.getOrCreate('yyy', 'bbb');
    const executor2 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers([executor1])]);

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(false);

    executor1.resolve('ccc');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    executor2.invalidate();

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(true);
  });

  test('invalidates a peer executor with the matching key if an executor is created with an initial value', () => {
    const executor1 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);

    const executor2 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(false);
  });

  test('does not invalidate a peer executor with the matching key if an executor is created without an initial value', () => {
    const executor1 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);

    const executor2 = manager.getOrCreate('xxx', undefined, [invalidatePeers(executor => executor.key === 'yyy')]);

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);
  });

  test('invalidates a peer executor with the matching key if an executor is fulfilled', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    executor1.resolve('ccc');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(true);
  });

  test('invalidates a peer executor with the matching key if an executor is invalidated', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    executor1.invalidate();

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(true);
  });

  test('does not invalidate peers after detach', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    manager.detach(executor1.key);
    executor1.invalidate();

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(false);
  });

  test('removes peer after peer is detached', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [
      invalidatePeers(executor => executor.key === 'yyy' || executor.key === 'zzz'),
    ]);

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor1,
      version: 0,
      payload: { type: 'invalidatePeers', options: { peerExecutors: [] } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor1, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor1, version: 1 });

    const executor2 = manager.getOrCreate('yyy');

    expect(listenerMock).toHaveBeenCalledTimes(5);
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'attached', target: executor2, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(5, {
      type: 'plugin_configured',
      target: executor1,
      version: 1,
      payload: { type: 'invalidatePeers', options: { peerExecutors: [executor2] } },
    });

    executor2.manager.detach(executor2.key);

    expect(listenerMock).toHaveBeenCalledTimes(7);
    expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'detached', target: executor2, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(7, {
      type: 'plugin_configured',
      target: executor1,
      version: 1,
      payload: { type: 'invalidatePeers', options: { peerExecutors: [] } },
    });
  });
});

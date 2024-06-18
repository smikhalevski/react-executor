import { fireEvent } from '@testing-library/react';
import { ExecutorManager } from '../../main';
import synchronizeStorage from '../../main/plugin/synchronizeStorage';

Date.now = () => 50;

describe('synchronizeStorage', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);

    localStorage.clear();
  });

  test('does not resolve an executor if there is no storage item', () => {
    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    expect(executor.isSettled).toBe(false);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  });

  test('resolves an executor if a fulfilled storage item exists', () => {
    localStorage.setItem('"xxx"', '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0}');

    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBeUndefined();
    expect(executor.settledAt).toBe(30);

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, {
      type: 'plugin_configured',
      target: executor,
      version: 1,
      payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'attached', target: executor, version: 1 });
  });

  test('rejects an executor if a rejected storage item exists', () => {
    localStorage.setItem(
      '"xxx"',
      '{"key":"xxx","isFulfilled":false,"value":"aaa","reason":"bbb","settledAt":30,"invalidatedAt":0}'
    );

    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBe('bbb');
    expect(executor.settledAt).toBe(30);

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'rejected', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, {
      type: 'plugin_configured',
      target: executor,
      version: 1,
      payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'attached', target: executor, version: 1 });
  });

  test('preserves the initial state if it is newer and sets storage item', () => {
    manager.hydrate({
      key: 'xxx',
      isFulfilled: true,
      value: 'aaa',
      reason: undefined,
      annotations: {},
      settledAt: 100,
      invalidatedAt: 0,
    });

    localStorage.setItem('"xxx"', '{"key":"xxx","isFulfilled":true,"value":"bbb","settledAt":30,"invalidatedAt":0}');

    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    expect(localStorage.getItem('"xxx"')).toBe(
      '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":100,"invalidatedAt":0}'
    );

    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBeUndefined();
    expect(executor.settledAt).toBe(100);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  });

  test('resolves an executor with an invalidated storage item', () => {
    localStorage.setItem('"xxx"', '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30}');

    const executor = manager.getOrCreate('xxx', 'bbb', [synchronizeStorage(localStorage)]);

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('"xxx"')).toBe('{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30}');

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'invalidated', target: executor, version: 2 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, {
      type: 'plugin_configured',
      target: executor,
      version: 2,
      payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'attached', target: executor, version: 2 });
  });

  test('sets storage item to the initial value', () => {
    const executor = manager.getOrCreate('xxx', 'aaa', [synchronizeStorage(localStorage)]);

    expect(executor.value).toBe('aaa');

    expect(localStorage.getItem('"xxx"')).toBe(
      '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
    );

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, {
      type: 'plugin_configured',
      target: executor,
      version: 0,
      payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
    });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
  });

  test('sets storage item if executor was resolved from a preceding plugin', () => {
    const executor = manager.getOrCreate('xxx', undefined, [
      executor => {
        executor.resolve('aaa');
      },
      synchronizeStorage(localStorage),
    ]);

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('"xxx"')).toBe(
      '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
    );
  });

  test('initial task is not called if storage item exists', async () => {
    const taskMock = jest.fn(() => 'bbb');

    localStorage.setItem('"xxx"', '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30}');

    const executor = manager.getOrCreate('xxx', taskMock, [synchronizeStorage(localStorage)]);

    expect(executor.value).toBe('aaa');
    expect(taskMock).not.toHaveBeenCalled();
  });

  test('does not set storage item or resolve an executor if an executor is pending', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [
      executor => {
        executor.execute(() => 'aaa');
      },
      synchronizeStorage(localStorage),
    ]);

    expect(executor.isPending).toBe(true);
    expect(executor.value).toBeUndefined();
    expect(localStorage.getItem('"xxx"')).toBeNull();

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('"xxx"')).toBe(
      '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
    );
  });

  test('resolves an executor when a storage item is set', () => {
    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: '"xxx"',
        storageArea: localStorage,
        newValue: '{"value":"aaa","settledAt":50}',
      })
    );

    expect(executor.value).toBe('aaa');
  });

  test('sets storage item if it was removed', () => {
    const executor = manager.getOrCreate('xxx', 'aaa', [synchronizeStorage(localStorage)]);

    localStorage.removeItem('"xxx"');

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: '"xxx"',
        storageArea: localStorage,
        newValue: null,
      })
    );

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('"xxx"')).toBe(
      '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
    );
  });

  test('removes a storage item if an executor was detached', () => {
    manager.getOrCreate('xxx', 'aaa', [synchronizeStorage(localStorage)]);

    manager.detach('xxx');

    expect(localStorage.getItem('"xxx"')).toBeNull();
  });
});

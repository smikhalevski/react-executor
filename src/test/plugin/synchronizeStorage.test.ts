import { fireEvent } from '@testing-library/react';
import { ExecutorManager } from '../../main';
import synchronizeStorage from '../../main/plugin/synchronizeStorage';

Date.now = jest.fn(() => 50);

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

    executor.activate();

    expect(executor.isSettled).toBe(false);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'activated', target: executor });
  });

  test('resolves an executor if a storage item exists', () => {
    localStorage.setItem('executor/xxx', '{"value":"aaa","timestamp":100}');

    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    executor.activate();

    expect(executor.value).toBe('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor });
  });

  test('sets storage item if it is stale when executor is created', () => {
    localStorage.setItem('executor/xxx', '{"value":"aaa","timestamp":0}');

    const executor = manager.getOrCreate('xxx', 'bbb', [synchronizeStorage(localStorage)]);

    executor.activate();

    expect(executor.value).toBe('bbb');
    expect(localStorage.getItem('executor/xxx')).toBe('{"value":"bbb","timestamp":50}');

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor });
  });

  test('sets storage item if executor was resolved from plugin', () => {
    const executor = manager.getOrCreate('xxx', undefined, [
      executor => {
        executor.resolve('aaa');
      },
      synchronizeStorage(localStorage),
    ]);

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('executor/xxx')).toBeNull();

    executor.activate();

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('executor/xxx')).toBe('{"value":"aaa","timestamp":50}');
  });

  test('does not set storage item or resolve an executor if an executor is pending', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [
      executor => {
        executor.execute(() => 'aaa');
      },
      synchronizeStorage(localStorage),
    ]);

    executor.activate();

    expect(executor.isPending).toBe(true);
    expect(executor.value).toBeUndefined();
    expect(localStorage.getItem('executor/xxx')).toBeNull();

    await executor.toPromise();

    expect(executor.isPending).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('executor/xxx')).toBe('{"value":"aaa","timestamp":50}');
  });

  test('resolves an executor when a storage item is set', () => {
    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    executor.activate();

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'executor/xxx',
        storageArea: localStorage,
        newValue: '{"value":"aaa","timestamp":50}',
      })
    );

    expect(executor.value).toBe('aaa');
  });

  test('ignores a storage item being set when an executor is deactivated', () => {
    const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

    const deactivate = executor.activate();
    deactivate();

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'executor/xxx',
        storageArea: localStorage,
        newValue: '{"value":"aaa","timestamp":50}',
      })
    );

    expect(executor.isSettled).toBe(false);
    expect(executor.value).toBeUndefined();
  });

  test('sets storage item if it was removed', () => {
    const executor = manager.getOrCreate('xxx', 'aaa', [synchronizeStorage(localStorage)]);

    executor.activate();
    localStorage.removeItem('executor/xxx');

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: 'executor/xxx',
        storageArea: localStorage,
        newValue: null,
      })
    );

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('executor/xxx')).toBe('{"value":"aaa","timestamp":50}');
  });

  test('removes a storage item if an executor was disposed', () => {
    manager.getOrCreate('xxx', 'aaa', [synchronizeStorage(localStorage)]);

    manager.dispose('xxx');

    expect(localStorage.getItem('executor/xxx')).toBeNull();
  });
});

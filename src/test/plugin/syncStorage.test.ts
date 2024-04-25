import { fireEvent } from '@testing-library/react';
import { ExecutorManager } from '../../main';
import syncStorage from '../../main/plugin/syncStorage';

describe('syncStorage', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();

    localStorage.clear();
  });

  test('does not resolve executor if item is not set in storage', () => {
    const executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

    expect(executor.isSettled).toBe(false);
  });

  test('reads the executor value from a storage', () => {
    localStorage.setItem('xxx', '"aaa"');

    const executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

    expect(executor.value).toBe('aaa');
  });

  test('sets item in storage if executor was resolved from plugin', () => {
    const executor = manager.getOrCreate<any>('xxx', undefined, [
      executor => {
        executor.resolve('aaa');
      },
      syncStorage(localStorage),
    ]);

    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('xxx')).toBe('"aaa"');
  });

  test('does not update storage or executor if executor is pending from plugin', async () => {
    const executor = manager.getOrCreate<any>('xxx', undefined, [
      executor => {
        executor.execute(() => 'aaa');
      },
      syncStorage(localStorage),
    ]);

    expect(executor.isPending).toBe(true);
    expect(executor.value).toBeUndefined();
    expect(localStorage.getItem('xxx')).toBeNull();

    await executor;

    expect(executor.isPending).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(localStorage.getItem('xxx')).toBe('"aaa"');
  });

  test('resolves executor value when storage item is set', () => {
    const executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

    expect(executor.value).toBeUndefined();

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: executor.key,
        storageArea: localStorage,
        newValue: '"aaa"',
      })
    );

    expect(executor.value).toBe('aaa');
  });

  test('clears executor value when storage item removed', () => {
    const executor = manager.getOrCreate('xxx', 'aaa', [syncStorage(localStorage)]);

    expect(executor.value).toBe('aaa');

    fireEvent(
      window,
      new StorageEvent('storage', {
        key: executor.key,
        storageArea: localStorage,
        newValue: null,
      })
    );

    expect(executor.value).toBeUndefined();
  });
});

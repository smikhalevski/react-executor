/**
 * @vitest-environment jsdom
 */

import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { ExecutorManager } from '../../main/index.js';
import synchronizeStorage from '../../main/plugin/synchronizeStorage.js';

Date.now = () => 50;

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

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
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{}}'
  );

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
    '{"key":"xxx","isFulfilled":false,"value":"aaa","reason":"bbb","settledAt":30,"invalidatedAt":0,"annotations":{}}'
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
  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30,"annotations":{}}'
  );

  const executor = manager.getOrCreate('xxx', 'bbb', [synchronizeStorage(localStorage)]);

  expect(executor.value).toBe('aaa');
  expect(localStorage.getItem('"xxx"')).toBe(
    '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30,"annotations":{}}'
  );

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
  const taskMock = vi.fn(() => 'bbb');

  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30,"annotations":{}}'
  );

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
      newValue: '{"value":"aaa","settledAt":50,"annotations":{}}',
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

test('sets storage item if executor was cleared', () => {
  localStorage.setItem('"xxx"', '{"key":"xxx","isFulfilled":false,"annotations":{},"settledAt":0,"invalidatedAt":0}');

  const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

  expect(executor.value).toBe(undefined);

  executor.resolve('aaa');

  expect(executor.value).toBe('aaa');
  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
  );

  executor.clear();

  expect(executor.value).toBe(undefined);
  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":false,"annotations":{},"settledAt":0,"invalidatedAt":0}'
  );
});

test('ignores stored empty annotations', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{}}'
  );

  const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

  expect(executor.annotations).toEqual({});

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

test('restores non-empty annotations', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

  expect(executor.annotations).toEqual({ zzz: 111 });

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'annotated', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 2 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'plugin_configured',
    target: executor,
    version: 2,
    payload: { type: 'synchronizeStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'attached', target: executor, version: 2 });
});

test('sets storage item if annotations are changed', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":false,"settledAt":0,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  const executor = manager.getOrCreate('xxx', undefined, [synchronizeStorage(localStorage)]);

  executor.annotate({ zzz: 222 });

  expect(executor.annotations).toEqual({ zzz: 222 });

  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":false,"annotations":{"zzz":222},"settledAt":0,"invalidatedAt":0}'
  );
});

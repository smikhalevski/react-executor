/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, expect, Mock, test, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { Executor, ExecutorManager } from '../../main/index.js';
import syncStorage from '../../main/plugin/syncStorage.js';
import { ExecutorImpl } from '../../main/ExecutorImpl.js';
import { noop } from '../../main/utils.js';

vi.useFakeTimers();

Date.now = () => 50;

let listenerMock: Mock;
let manager: ExecutorManager;
let executor: Executor;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);

  localStorage.clear();
});

afterEach(() => {
  manager.detach(executor.key);
});

test('does not resolve an executor if there is no storage item', () => {
  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

  expect(executor.isSettled).toBe(false);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
});

test('resolves an executor if a fulfilled storage item exists', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{}}'
  );

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

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
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'attached', target: executor, version: 1 });
});

test('rejects an executor if a rejected storage item exists', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":false,"value":"aaa","reason":"bbb","settledAt":30,"invalidatedAt":0,"annotations":{}}'
  );

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

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
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
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

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

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
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
});

test('resolves an executor with an invalidated storage item', () => {
  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30,"annotations":{}}'
  );

  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  expect(executor.value).toBe('aaa');
  expect(localStorage.getItem('"xxx"')).toBe(
    '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30,"annotations":{}}'
  );

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'invalidated', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'plugin_configured',
    target: executor,
    version: 1,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'attached', target: executor, version: 1 });
});

test('does not publish invalidated event if executor is already invalidated', () => {
  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  executor.invalidate();

  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":100,"invalidatedAt":30,"annotations":{}}'
  );

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(listenerMock).toHaveBeenCalledTimes(5);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'invalidated', target: executor, version: 2 });
  expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'fulfilled', target: executor, version: 3 });
});

test('sets storage item to the initial value', () => {
  executor = manager.getOrCreate('xxx', 'aaa', [syncStorage(localStorage)]);

  expect(executor.value).toBe('aaa');

  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
  );

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
});

test('sets storage item if executor was resolved from a preceding plugin', () => {
  executor = manager.getOrCreate('xxx', undefined, [
    executor => {
      executor.resolve('aaa');
    },
    syncStorage(localStorage),
  ]);

  expect(executor.value).toBe('aaa');
  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
  );
});

test('initial task is not called if storage item exists', () => {
  const taskMock = vi.fn(() => 'bbb');

  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":20,"invalidatedAt":30,"annotations":{}}'
  );

  executor = manager.getOrCreate('xxx', taskMock, [syncStorage(localStorage)]);

  expect(executor.value).toBe('aaa');
  expect(taskMock).not.toHaveBeenCalled();
});

test('does not set storage item or resolve an executor if an executor is pending', async () => {
  executor = manager.getOrCreate('xxx', undefined, [
    executor => {
      executor.execute(() => 'aaa');
    },
    syncStorage(localStorage),
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
  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

  localStorage.setItem('"xxx"', '{"value":"aaa","settledAt":50,"invalidatedAt":0,"annotations":{},"isFulfilled":true}');

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(executor.value).toBe('aaa');
});

test('sets storage item if it was removed', () => {
  executor = manager.getOrCreate('xxx', 'aaa', [syncStorage(localStorage)]);

  localStorage.removeItem('"xxx"');

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(executor.value).toBe('aaa');
  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":true,"value":"aaa","annotations":{},"settledAt":50,"invalidatedAt":0}'
  );
});

test('removes a storage item if an executor was detached', () => {
  manager.getOrCreate('xxx', 'aaa', [syncStorage(localStorage)]);

  manager.detach('xxx');

  expect(localStorage.getItem('"xxx"')).toBeNull();
});

test('sets storage item if executor was cleared', () => {
  localStorage.setItem('"xxx"', '{"key":"xxx","isFulfilled":false,"annotations":{},"settledAt":0,"invalidatedAt":0}');

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

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

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

  expect(executor.annotations).toEqual({});

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'plugin_configured',
    target: executor,
    version: 1,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'attached', target: executor, version: 1 });
});

test('does not publish annotated events if annotations are shallow equal', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  executor = manager.getOrCreate('xxx', undefined, [
    executor => executor.annotate({ zzz: 111 }),
    syncStorage(localStorage),
  ]);

  expect(executor.annotations).toEqual({ zzz: 111 });

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'annotated', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 2 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'plugin_configured',
    target: executor,
    version: 2,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'attached', target: executor, version: 2 });
});

test('restores non-empty annotations', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

  expect(executor.annotations).toEqual({ zzz: 111 });

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'annotated', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'plugin_configured',
    target: executor,
    version: 1,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'attached', target: executor, version: 1 });
});

test('overwrites annotations', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":true,"value":"aaa","settledAt":30,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  executor = manager.getOrCreate('xxx', undefined, [
    executor => executor.annotate({ kkk: 222 }),
    syncStorage(localStorage),
  ]);

  expect(executor.annotations).toEqual({ zzz: 111 });
});

test('sets storage item if annotations are changed', () => {
  localStorage.setItem(
    '"xxx"',
    '{"key":"xxx","isFulfilled":false,"settledAt":0,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

  executor.annotate({ zzz: 222 });

  expect(executor.annotations).toEqual({ zzz: 222 });

  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":false,"annotations":{"zzz":222},"settledAt":0,"invalidatedAt":0}'
  );
});

test('overwrites storage item if an error is thrown during parsing', () => {
  localStorage.setItem('"xxx"', 'invalid_state');

  executor = manager.getOrCreate('xxx', undefined, [
    syncStorage(localStorage, {
      serializer: {
        parse() {
          throw new Error('expected');
        },
        stringify: JSON.stringify,
      },
    }),
  ]);

  expect(executor).toBeInstanceOf(ExecutorImpl);

  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":false,"annotations":{},"settledAt":0,"invalidatedAt":0}'
  );

  expect(() => vi.runAllTimers()).toThrow(new Error('expected'));
});

test('overwrites storage item if it contains a malformed state', () => {
  localStorage.setItem('"xxx"', '{"annotations":"zzz"}');

  executor = manager.getOrCreate('xxx', undefined, [syncStorage(localStorage)]);

  expect(executor).toBeInstanceOf(ExecutorImpl);

  expect(localStorage.getItem('"xxx"')).toBe(
    '{"key":"xxx","isFulfilled":false,"annotations":{},"settledAt":0,"invalidatedAt":0}'
  );

  expect(() => vi.runAllTimers()).not.toThrow();
});

test('executor is updated with storage item before any events are published', () => {
  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  const listenerMock = vi.fn();

  executor.subscribe(() => listenerMock(executor.toJSON()));

  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":100,"invalidatedAt":30,"annotations":{}}'
  );

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(executor.value).toBe('aaa');

  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    key: 'xxx',
    value: 'aaa',
    reason: undefined,
    annotations: {},
    invalidatedAt: 30,
    isFulfilled: true,
    settledAt: 100,
  });
});

test('syncs state if task is aborted', () => {
  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  executor.execute(() => new Promise(noop));

  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":100,"invalidatedAt":30,"annotations":{}}'
  );

  expect(executor.value).toBe('bbb');

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'pending', target: executor, version: 2 });

  executor.abort();

  expect(executor.value).toBe('aaa');

  expect(listenerMock).toHaveBeenCalledTimes(7);
  expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'aborted', target: executor, version: 3 });
  expect(listenerMock).toHaveBeenNthCalledWith(6, { type: 'fulfilled', target: executor, version: 4 });
  expect(listenerMock).toHaveBeenNthCalledWith(7, { type: 'invalidated', target: executor, version: 4 });
});

test('publishes only annotated event', () => {
  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  localStorage.setItem(
    '"xxx"',
    '{"value":"bbb","isFulfilled":true,"settledAt":50,"invalidatedAt":0,"annotations":{"zzz":111}}'
  );

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'annotated', target: executor, version: 2 });
});

test('publishes only fulfilled event', () => {
  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  localStorage.setItem(
    '"xxx"',
    '{"value":"aaa","isFulfilled":true,"settledAt":100,"invalidatedAt":0,"annotations":{}}'
  );

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 2 });
});

test('publishes only invalidated event', () => {
  executor = manager.getOrCreate('xxx', 'bbb', [syncStorage(localStorage)]);

  localStorage.setItem(
    '"xxx"',
    '{"value":"bbb","isFulfilled":true,"settledAt":50,"invalidatedAt":100,"annotations":{}}'
  );

  fireEvent(window, new StorageEvent('storage', { key: '"xxx"', storageArea: localStorage }));

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncStorage', options: { storageKey: '"xxx"' } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'invalidated', target: executor, version: 2 });
});

import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';
import { ExecutorManager } from '../main/index.js';
import { ExecutorImpl } from '../main/ExecutorImpl.js';

Date.now = () => 50;

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();
  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

describe('constructor', () => {
  test('creates executors with plugins', () => {
    const pluginMock = vi.fn(_executor => {});

    const manager = new ExecutorManager({
      plugins: [pluginMock],
    });

    const executor1 = manager.getOrCreate('xxx');
    const executor2 = manager.getOrCreate('yyy');

    expect(pluginMock).toHaveBeenCalledTimes(2);
    expect(pluginMock).toHaveBeenNthCalledWith(1, executor1);
    expect(pluginMock).toHaveBeenNthCalledWith(2, executor2);
  });
});

describe('getOrCreate', () => {
  test('creates the new executor', () => {
    const executor = manager.getOrCreate('aaa');

    expect(executor).toBeInstanceOf(ExecutorImpl);
    expect(executor.key).toBe('aaa');
    expect(executor.manager).toBe(manager);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBeUndefined();
    expect(executor.reason).toBeUndefined();

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'attached', target: executor, version: 0 });
  });

  test('returns the existing executor', () => {
    expect(manager.getOrCreate('aaa')).toBe(manager.getOrCreate('aaa'));
  });

  test('applies the plugin only once', () => {
    const pluginMock = vi.fn(_executor => {});

    manager.getOrCreate('aaa', undefined, [pluginMock]);

    const executor = manager.getOrCreate('aaa', undefined, [pluginMock]);

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBeUndefined();
    expect(executor.reason).toBeUndefined();

    expect(pluginMock).toHaveBeenCalledTimes(1);
    expect(pluginMock.mock.calls[0][0]).toBe(executor);
  });

  test('applies the literal initial value only once', () => {
    manager.getOrCreate('aaa', 111);

    const executor = manager.getOrCreate('aaa', 222);

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBeUndefined();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 1 });
  });

  test('applies the initial task only once', async () => {
    const taskMock = vi.fn(() => 111);

    manager.getOrCreate('aaa', taskMock);

    const executor = manager.getOrCreate('aaa', taskMock);

    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBeUndefined();
    expect(executor.reason).toBeUndefined();
    expect(taskMock).toHaveBeenCalledTimes(1);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'pending', target: executor, version: 1 });

    await expect(executor.getOrAwait()).resolves.toBe(111);

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBeUndefined();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 2 });
  });

  test('does not apply initial value if executor was resolved from a plugin', () => {
    const taskMock = vi.fn(() => 111);

    const executor = manager.getOrCreate('aaa', taskMock, [
      executor => {
        executor.resolve(222);
      },
    ]);

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(222);
    expect(executor.reason).toBeUndefined();

    expect(taskMock).toHaveBeenCalledTimes(0);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 1 });
  });

  test('does not apply initial value if a task execution was started form a plugin', async () => {
    const taskMock = vi.fn(() => 111);

    const executor = manager.getOrCreate('aaa', taskMock, [
      executor => {
        executor.execute(() => 222);
      },
    ]);

    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBeUndefined();
    expect(executor.reason).toBeUndefined();

    expect(taskMock).toHaveBeenCalledTimes(0);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 1 });

    await executor.getOrAwait();

    expect(executor.value).toBe(222);

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 2 });
  });

  test('events from the created executor are passed to the manager', async () => {
    const executor1 = manager.getOrCreate('aaa');
    const executor2 = manager.getOrCreate('bbb');

    executor1.resolve(111);
    executor2.resolve(222);

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'attached', target: executor1, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor2, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor1, version: 1 });
    expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor2, version: 1 });
  });

  test('creates an executor with an object key', () => {
    const manager = new ExecutorManager({
      keySerializer: JSON.stringify,
    });

    const expectedKey = ['aaa'];
    const executor1 = manager.getOrCreate(expectedKey);
    const executor2 = manager.getOrCreate(['aaa']);

    expect(executor1).toBe(executor2);
    expect(executor1.key).toBe(expectedKey);
    expect(manager.get(['aaa'])).toBe(executor1);
  });
});

describe('get', () => {
  test('return undefined if there is executor with the key', () => {
    expect(manager.get('aaa')).toBeUndefined();
  });

  test('returns the existing executor', () => {
    manager.getOrCreate('aaa');

    expect(manager.get('aaa')).toBeInstanceOf(ExecutorImpl);
    expect(manager.get('aaa')).toBe(manager.get('aaa'));
  });
});

describe('getOrAwait', () => {
  test('waits for an executor', async () => {
    await expect(manager.getOrAwait('aaa')).resolves.toBe(manager.getOrCreate('aaa'));
  });

  test('resolves with the existing executor', async () => {
    const executor = manager.getOrCreate('aaa');
    const executorPromise = manager.getOrAwait('aaa');

    await expect(executorPromise).resolves.toBe(executor);
  });
});

describe('detach', () => {
  test('no-op is there is no executor with the key', () => {
    expect(manager.detach('aaa')).toBe(false);
    expect(listenerMock).toHaveBeenCalledTimes(0);
  });

  test('no-op if executor exists and is active', () => {
    const executor = manager.getOrCreate('aaa');

    executor.activate();

    expect(manager.detach('aaa')).toBe(false);
  });

  test('detaches non-active executor', () => {
    const executorListenerMock = vi.fn();
    const executor = manager.getOrCreate('aaa');

    executor.subscribe(executorListenerMock);

    expect(manager.detach('aaa')).toBe(true);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'attached', target: executor, version: 0 });
    expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'detached', target: executor, version: 0 });

    expect(executorListenerMock).toHaveBeenCalledTimes(1);
    expect(executorListenerMock).toHaveBeenNthCalledWith(1, { type: 'detached', target: executor, version: 0 });

    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executorListenerMock).toHaveBeenCalledTimes(1);

    expect(executor).not.toBe(manager.getOrCreate('aaa'));
  });
});

describe('Symbol.iterator', () => {
  test('converts manager to an array of executors', () => {
    const executor1 = manager.getOrCreate('aaa');
    const executor2 = manager.getOrCreate('bbb');

    expect(Array.from(manager)).toEqual([executor1, executor2]);
  });
});

describe('toJSON', () => {
  test('returns an executor manager state', () => {
    manager.getOrCreate('xxx', 111);

    expect(manager.toJSON()).toEqual([
      {
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      },
    ]);
  });

  test('used by JSON.stringify', () => {
    manager.getOrCreate('xxx', 111);

    expect(JSON.stringify(manager)).toBe(
      '[{"key":"xxx","isFulfilled":true,"value":111,"annotations":{},"settledAt":50,"invalidatedAt":0}]'
    );
  });
});

describe('hydrate', () => {
  test('hydrates the non-existent executor', () => {
    expect(
      manager.hydrate({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      })
    ).toBe(true);

    expect(manager.get('xxx')).toBeUndefined();

    const executor = manager.getOrCreate('xxx');

    expect(executor.value).toBe(111);
    expect(executor.settledAt).toBe(50);
  });

  test('overwrites the previous hydration state', () => {
    manager.hydrate({
      key: 'xxx',
      isFulfilled: true,
      value: 111,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    });

    expect(
      manager.hydrate({
        key: 'xxx',
        isFulfilled: true,
        value: 222,
        reason: undefined,
        settledAt: 100,
        invalidatedAt: 0,
        annotations: {},
      })
    ).toBe(true);

    expect(manager.get('xxx')).toBeUndefined();

    const executor = manager.getOrCreate('xxx');

    expect(executor.value).toBe(222);
    expect(executor.settledAt).toBe(100);
  });

  test('does not hydrate the existing executor', () => {
    const executor = manager.getOrCreate('xxx');

    expect(
      manager.hydrate({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      })
    ).toBe(false);

    expect(executor.value).toBe(undefined);
    expect(executor.settledAt).toBe(0);
  });

  test('preserves initial task of the hydrated executor', () => {
    expect(
      manager.hydrate({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      })
    ).toBe(true);

    const task = () => 222;
    const executor = manager.getOrCreate('xxx', task);

    expect(executor.value).toBe(111);
    expect(executor.settledAt).toBe(50);
    expect(executor.task).toBe(task);
  });
});

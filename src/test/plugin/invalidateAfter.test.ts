import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import invalidateAfter from '../../main/plugin/invalidateAfter.js';

vi.useFakeTimers();

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('invalidates the initial value', async () => {
  manager.hydrate({
    key: 'xxx',
    isFulfilled: true,
    value: 111,
    reason: undefined,
    annotations: {},
    settledAt: 50,
    invalidatedAt: 0,
  });

  const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);

  expect(executor.isInvalidated).toBe(true);
});

test('invalidates an executor after a timeout', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);
  executor.activate();
  executor.resolve('aaa');

  vi.runAllTimers();

  expect(executor.isInvalidated).toBe(true);

  expect(listenerMock).toHaveBeenCalledTimes(5);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'invalidateAfter', options: { delay: 100 } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'invalidated', target: executor, version: 2 });
});

test('delays invalidation every time an executor is fulfilled', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);
  executor.activate();
  executor.resolve('aaa');

  vi.advanceTimersByTime(99);

  executor.resolve('bbb');

  vi.advanceTimersByTime(99);

  expect(listenerMock).toHaveBeenCalledTimes(5);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'invalidateAfter', options: { delay: 100 } },
  });
  expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'attached', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'activated', target: executor, version: 0 });
  expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 1 });
  expect(listenerMock).toHaveBeenNthCalledWith(5, { type: 'fulfilled', target: executor, version: 2 });
});

import { beforeEach, expect, type Mock, test, vi } from 'vitest';
import { type Executor, type ExecutorEvent, ExecutorManager } from '../../main/index.ts';
import invalidateAfter from '../../main/plugin/invalidateAfter.ts';
import { noop } from '../../main/utils.ts';
import { mockExecutorState } from '../mocks.ts';

vi.useFakeTimers();

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('invalidates the initial value', async () => {
  manager.hydrate('xxx', {
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

test('invalidates the initial value after a timeout', () => {
  manager.hydrate('xxx', {
    isFulfilled: true,
    value: 111,
    reason: undefined,
    annotations: {},
    settledAt: Date.now() - 50,
    invalidatedAt: 0,
  });

  const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);

  vi.advanceTimersByTime(49);

  expect(executor.isInvalidated).toBe(false);

  vi.advanceTimersByTime(1);

  expect(executor.isInvalidated).toBe(true);
});

test('counts the timeout from the settlement', () => {
  const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);

  executor.resolve('aaa', Date.now() - 50);

  vi.advanceTimersByTime(50);

  expect(executor.isInvalidated).toBe(true);
});

test('does not invalidate an executor if a plugin throws', () => {
  let executor: Executor | undefined;

  manager.hydrate('xxx', {
    isFulfilled: true,
    value: 111,
    reason: undefined,
    annotations: {},
    settledAt: Date.now(),
    invalidatedAt: 0,
  });

  expect(() =>
    manager.getOrCreate('xxx', undefined, [
      invalidateAfter(100),
      pluginExecutor => {
        executor = pluginExecutor;
        throw new Error('expected');
      },
    ])
  ).toThrow('expected');

  vi.runAllTimers();

  expect(executor!.isInvalidated).toBe(false);
});

test('does not invalidate an executor that is pending when it is attached', () => {
  manager.hydrate('xxx', mockExecutorState({ isFulfilled: true, value: 111, settledAt: Date.now() }));

  const executor = manager.getOrCreate('xxx', undefined, [
    invalidateAfter(100),
    pluginExecutor => {
      pluginExecutor.execute(() => new Promise(noop));
    },
  ]);

  vi.runAllTimers();

  expect(executor.isInvalidated).toBe(false);
});

test('invalidates a rejected executor after a timeout', () => {
  const executor = manager.getOrCreate('xxx', undefined, [invalidateAfter(100)]);

  executor.reject(new Error('expected'));

  vi.advanceTimersByTime(100);

  expect(executor.isInvalidated).toBe(true);
});

test('invalidates an executor if an optimistic task is aborted after the timeout', () => {
  const executor = manager.getOrCreate('xxx', 'aaa', [invalidateAfter(100)]);

  executor.execute({ callback: () => new Promise(noop), pendingValue: 'bbb' });

  vi.advanceTimersByTime(100);

  executor.abort();

  vi.runAllTimers();

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
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'activated',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'fulfilled',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'invalidated',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
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
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'activated',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'fulfilled',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'fulfilled',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
});

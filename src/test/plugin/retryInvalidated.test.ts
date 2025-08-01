import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { ExecutorEvent, ExecutorManager } from '../../main/index.js';
import retryInvalidated from '../../main/plugin/retryInvalidated.js';

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();
  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('retries the invalidated active executor', async () => {
  const taskMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
  const executor = manager.getOrCreate('xxx', taskMock, [retryInvalidated()]);

  executor.activate();

  await executor.getOrAwait();

  expect(executor.isPending).toBe(false);
  expect(executor.isInvalidated).toBe(false);
  expect(executor.value).toBe('aaa');

  executor.invalidate();

  expect(executor.isPending).toBe(true);
  expect(executor.isInvalidated).toBe(true);
  expect(executor.value).toBe('aaa');

  await executor.getOrAwait();

  expect(executor.isPending).toBe(false);
  expect(executor.isInvalidated).toBe(false);
  expect(executor.value).toBe('bbb');

  expect(listenerMock).toHaveBeenCalledTimes(8);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'retryInvalidated', options: { isEager: false } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'pending',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'activated',
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
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'invalidated',
    target: executor,
    version: 3,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(7, {
    type: 'pending',
    target: executor,
    version: 4,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(8, {
    type: 'fulfilled',
    target: executor,
    version: 5,
    payload: undefined,
  } satisfies ExecutorEvent);
});

test('retries the activated and invalidated executor', async () => {
  const taskMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
  const executor = manager.getOrCreate('xxx', taskMock, [retryInvalidated()]);

  await executor.getOrAwait();

  expect(executor.isPending).toBe(false);
  expect(executor.isInvalidated).toBe(false);
  expect(executor.value).toBe('aaa');

  executor.invalidate();
  executor.activate();

  expect(executor.isPending).toBe(true);
  expect(executor.isInvalidated).toBe(true);
  expect(executor.value).toBe('aaa');

  await executor.getOrAwait();

  expect(executor.isPending).toBe(false);
  expect(executor.isInvalidated).toBe(false);
  expect(executor.value).toBe('bbb');

  expect(listenerMock).toHaveBeenCalledTimes(8);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'retryInvalidated', options: { isEager: false } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'pending',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'fulfilled',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'invalidated',
    target: executor,
    version: 3,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'activated',
    target: executor,
    version: 3,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(7, {
    type: 'pending',
    target: executor,
    version: 4,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(8, {
    type: 'fulfilled',
    target: executor,
    version: 5,
    payload: undefined,
  } satisfies ExecutorEvent);
});

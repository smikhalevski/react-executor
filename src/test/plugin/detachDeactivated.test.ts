import { afterEach, beforeEach, expect, Mock, test, vi } from 'vitest';
import { ExecutorEvent, ExecutorManager } from '../../main/index.js';
import detachDeactivated from '../../main/plugin/detachDeactivated.js';
import { sleep } from '../test-utils.js';

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

afterEach(() => {
  vi.useRealTimers();
});

test('detaches a deactivated executor', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [detachDeactivated({ delay: 0 })]);
  const deactivate = executor.activate();
  const callbackMock = vi.fn(_signal => sleep(100, 'aaa'));
  const promise = executor.execute(callbackMock);

  deactivate();

  await expect(promise).resolves.toBe('aaa');

  expect(listenerMock).toHaveBeenCalledTimes(6);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'detachInactive', options: { delayAfterDeactivated: 0 } },
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
    type: 'pending',
    target: executor,
    version: 1,
    payload: { task: { callback: callbackMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'deactivated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'detached',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
});

test('cancels detachment of a reactivated executor', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [detachDeactivated({ delay: 0 })]);
  const deactivate = executor.activate();
  const callbackMock = vi.fn(_signal => sleep(100, 'aaa'));
  const promise = executor.execute(callbackMock);

  deactivate();
  executor.activate();

  await expect(promise).resolves.toBe('aaa');

  expect(listenerMock).toHaveBeenCalledTimes(7);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'detachInactive', options: { delayAfterDeactivated: 0 } },
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
    type: 'pending',
    target: executor,
    version: 1,
    payload: { task: { callback: callbackMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'deactivated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'activated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(7, {
    type: 'fulfilled',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
});

test('detaches a deactivated executor after 5 seconds by default', () => {
  vi.useFakeTimers();

  const executor = manager.getOrCreate('xxx', undefined, [detachDeactivated()]);
  const deactivate = executor.activate();

  deactivate();

  vi.advanceTimersByTime(4_999);

  expect(manager.get('xxx')).toBe(executor);

  vi.advanceTimersByTime(1);

  expect(manager.get('xxx')).toBeUndefined();
});

test('does not detach an executor that was never activated', () => {
  vi.useFakeTimers();

  const executor = manager.getOrCreate('xxx', undefined, [detachDeactivated({ delay: 0 })]);

  vi.runAllTimers();

  expect(manager.get('xxx')).toBe(executor);
});

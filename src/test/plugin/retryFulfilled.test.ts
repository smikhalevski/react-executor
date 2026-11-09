import { beforeEach, expect, type Mock, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.ts';
import retryFulfilled from '../../main/plugin/retryFulfilled.ts';
import { noop } from '../../main/utils.ts';

vi.useFakeTimers();

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('retries a fulfilled executor', async () => {
  const callbackMock = vi.fn();
  const executor = manager.getOrCreate('xxx', callbackMock, [retryFulfilled({ count: 2, delay: 0 })]);

  executor.activate();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait();
  expect(executor.isPending).toBe(false);

  // Retry 1
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait();
  expect(executor.isPending).toBe(false);

  // Retry 2
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait();
  expect(executor.isPending).toBe(false);

  // Retry 3
  vi.runAllTimers();
  expect(executor.isPending).toBe(false);

  expect(callbackMock).toHaveBeenCalledTimes(3);
});

test('stops retrying if an executor is aborted', async () => {
  const callbackMock = vi.fn();
  const executor = manager.getOrCreate('xxx', callbackMock, [retryFulfilled({ count: 2, delay: 0 })]);

  executor.activate();
  await executor.getOrAwait();

  // Retry 1 is scheduled
  executor.execute(callbackMock);
  executor.abort();

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(2);
});

test('stops retrying if an executor is rejected', async () => {
  const callbackMock = vi.fn();
  const executor = manager.getOrCreate('xxx', callbackMock, [retryFulfilled({ count: 2, delay: 0 })]);

  executor.activate();
  await executor.getOrAwait();

  // Retry 1 is scheduled
  executor.reject(undefined);

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('stops retrying if an executor is deactivated', async () => {
  const callbackMock = vi.fn();
  const executor = manager.getOrCreate('xxx', callbackMock, [retryFulfilled({ count: 2, delay: 0 })]);

  const deactivate = executor.activate();
  await executor.getOrAwait();

  // Retry 1 is scheduled
  deactivate();

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('retries a fulfilled executor after 5 seconds by default', async () => {
  const executor = manager.getOrCreate('xxx', noop, [retryFulfilled()]);

  executor.activate();
  await executor.getOrAwait();

  vi.advanceTimersByTime(4_999);
  expect(executor.isPending).toBe(false);

  vi.advanceTimersByTime(1);
  expect(executor.isPending).toBe(true);
});

test('retries a fulfilled executor after the delay returned by a callback', async () => {
  const delayMock = vi.fn().mockReturnValue(1_000);
  const executor = manager.getOrCreate('xxx', noop, [retryFulfilled({ delay: delayMock })]);

  executor.activate();
  await executor.getOrAwait();

  vi.advanceTimersByTime(999);
  expect(executor.isPending).toBe(false);

  vi.advanceTimersByTime(1);
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait();

  expect(delayMock).toHaveBeenCalledTimes(2);
  expect(delayMock).toHaveBeenNthCalledWith(1, 0, executor);
  expect(delayMock).toHaveBeenNthCalledWith(2, 1, executor);
});

test('retries a fulfilled executor after it is activated', async () => {
  const executor = manager.getOrCreate('xxx', noop, [retryFulfilled({ delay: 5_000 })]);

  await executor.getOrAwait();

  vi.advanceTimersByTime(5_000);
  expect(executor.isPending).toBe(false);

  executor.activate();

  // The delay is counted from the settlement
  vi.advanceTimersByTime(0);
  expect(executor.isPending).toBe(true);
});

test('retries an inactive executor if isEager is true', async () => {
  const executor = manager.getOrCreate('xxx', noop, [retryFulfilled({ delay: 0, isEager: true })]);

  await executor.getOrAwait();

  vi.runAllTimers();
  expect(executor.isPending).toBe(true);
});

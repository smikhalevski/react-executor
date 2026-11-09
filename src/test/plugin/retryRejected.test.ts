import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import retryRejected from '../../main/plugin/retryRejected.js';
import { noop } from '../../main/utils.js';

vi.useFakeTimers();

const expectedReason = new Error('expected');

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('retries a rejected executor', async () => {
  const callbackMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', callbackMock, [retryRejected({ count: 2, delay: 0 })]);

  executor.activate();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait().then(noop, noop);
  expect(executor.isPending).toBe(false);

  // Retry 1
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait().then(noop, noop);
  expect(executor.isPending).toBe(false);

  // Retry 2
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait().then(noop, noop);
  expect(executor.isPending).toBe(false);

  // Retry 3
  vi.runAllTimers();
  expect(executor.isPending).toBe(false);

  expect(callbackMock).toHaveBeenCalledTimes(3);
});

test('stops retrying if an executor is aborted', async () => {
  const callbackMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', callbackMock, [retryRejected({ count: 2, delay: 0 })]);

  executor.activate();
  await executor.getOrAwait().then(noop, noop);

  // Retry 1 is scheduled
  executor.execute(callbackMock);
  executor.abort();

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(2);
});

test('stops retrying if an executor is fulfilled', async () => {
  const callbackMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', callbackMock, [retryRejected({ count: 2, delay: 0 })]);

  executor.activate();
  await executor.getOrAwait().then(noop, noop);

  // Retry 1 is scheduled
  executor.resolve(undefined);

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('stops retrying if an executor is deactivated', async () => {
  const callbackMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', callbackMock, [retryRejected({ count: 2, delay: 0 })]);

  const deactivate = executor.activate();
  await executor.getOrAwait().then(noop, noop);

  // Retry 1 is scheduled
  deactivate();

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('retries a rejected executor 3 times with an exponential backoff by default', async () => {
  const callbackMock = vi.fn().mockRejectedValue(expectedReason);

  const executor = manager.getOrCreate('xxx', callbackMock, [retryRejected()]);

  executor.activate();
  await executor.getOrAwait().then(noop, noop);

  // Retry 1
  vi.advanceTimersByTime(999);
  expect(callbackMock).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(callbackMock).toHaveBeenCalledTimes(2);
  await executor.getOrAwait().then(noop, noop);

  // Retry 2
  vi.advanceTimersByTime(1_799);
  expect(callbackMock).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(1);
  expect(callbackMock).toHaveBeenCalledTimes(3);
  await executor.getOrAwait().then(noop, noop);

  // Retry 3
  vi.advanceTimersByTime(3_239);
  expect(callbackMock).toHaveBeenCalledTimes(3);
  vi.advanceTimersByTime(1);
  expect(callbackMock).toHaveBeenCalledTimes(4);
  await executor.getOrAwait().then(noop, noop);

  // Retry 4
  vi.runAllTimers();
  expect(callbackMock).toHaveBeenCalledTimes(4);
});

test('resets the number of retries if an executor is fulfilled', async () => {
  const callbackMock = vi.fn().mockRejectedValue(expectedReason);

  const executor = manager.getOrCreate('xxx', callbackMock, [retryRejected({ count: 1, delay: 0 })]);

  executor.activate();
  await executor.getOrAwait().then(noop, noop);

  // Retry 1
  vi.runAllTimers();
  await executor.getOrAwait().then(noop, noop);

  executor.resolve('aaa');
  executor.retry();
  await executor.getOrAwait().then(noop, noop);

  // Retry 1 after the reset
  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(4);
});

test('retries a rejected executor after it is activated', async () => {
  const executor = manager.getOrCreate('xxx', () => Promise.reject(expectedReason), [retryRejected({ delay: 5_000 })]);

  await executor.getOrAwait().then(noop, noop);

  vi.advanceTimersByTime(5_000);
  expect(executor.isPending).toBe(false);

  executor.activate();

  // The delay is counted from the settlement
  vi.advanceTimersByTime(0);
  expect(executor.isPending).toBe(true);
});

test('retries an inactive executor if isEager is true', async () => {
  const executor = manager.getOrCreate('xxx', () => Promise.reject(expectedReason), [
    retryRejected({ delay: 0, isEager: true }),
  ]);

  await executor.getOrAwait().then(noop, noop);

  vi.runAllTimers();
  expect(executor.isPending).toBe(true);
});

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
  const taskMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected({ count: 2, delay: 0 })]);

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

  expect(taskMock).toHaveBeenCalledTimes(3);
});

test('stops retrying if an executor is aborted', async () => {
  const taskMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected({ count: 2, delay: 0 })]);

  executor.activate();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait().then(noop, noop);
  expect(executor.isPending).toBe(false);

  // Retry 1
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);

  executor.abort();

  // Retry 2
  vi.runAllTimers();
  expect(executor.isPending).toBe(false);

  expect(taskMock).toHaveBeenCalledTimes(2);
});

test('stops retrying if an executor is fulfilled', async () => {
  const taskMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected({ count: 2, delay: 0 })]);

  executor.activate();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait().then(noop, noop);
  expect(executor.isPending).toBe(false);

  // Retry 1
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);

  executor.resolve(undefined);

  // Retry 2
  vi.runAllTimers();
  expect(executor.isPending).toBe(false);

  expect(taskMock).toHaveBeenCalledTimes(2);
});

test('stops retrying if an executor is deactivated', async () => {
  const taskMock = vi.fn(() => {
    throw expectedReason;
  });

  const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected({ count: 2, delay: 0 })]);

  const deactivate = executor.activate();
  expect(executor.isPending).toBe(true);
  await executor.getOrAwait().then(noop, noop);
  expect(executor.isPending).toBe(false);

  // Retry 1
  vi.runAllTimers();
  expect(executor.isPending).toBe(true);

  deactivate();

  await executor.getOrAwait().then(noop, noop);

  // Retry 2
  vi.runAllTimers();
  expect(executor.isPending).toBe(false);

  expect(taskMock).toHaveBeenCalledTimes(2);
});

import { describe, expect, test, beforeEach, vi, Mock } from 'vitest';
import { ExecutorManager } from '../../main';
import retryFulfilled from '../../main/plugin/retryFulfilled';
import { noop } from '../../main/utils';

vi.useFakeTimers();

describe('retryFulfilled', () => {
  let listenerMock: Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = vi.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('retries a fulfilled executor', async () => {
    const taskMock = vi.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled({ count: 2, delay: 0 })]);

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

    expect(taskMock).toHaveBeenCalledTimes(3);
  });

  test('stops retrying if an executor is aborted', async () => {
    const taskMock = vi.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled({ count: 2, delay: 0 })]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.getOrAwait();
    expect(executor.isPending).toBe(false);

    // Retry 1
    vi.runAllTimers();
    expect(executor.isPending).toBe(true);

    executor.promise!.catch(noop);
    executor.abort();

    // Retry 2
    vi.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('stops retrying if an executor is rejected', async () => {
    const taskMock = vi.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled({ count: 2, delay: 0 })]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.getOrAwait();
    expect(executor.isPending).toBe(false);

    // Retry 1
    vi.runAllTimers();
    expect(executor.isPending).toBe(true);

    executor.promise!.catch(noop);
    executor.reject(undefined);

    // Retry 2
    vi.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('stops retrying if an executor is deactivated', async () => {
    const taskMock = vi.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled({ count: 2, delay: 0 })]);

    const deactivate = executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.getOrAwait();
    expect(executor.isPending).toBe(false);

    // Retry 1
    vi.runAllTimers();
    expect(executor.isPending).toBe(true);

    deactivate();
    await executor.getOrAwait();

    // Retry 2
    vi.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });
});

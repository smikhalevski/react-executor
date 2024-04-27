import { ExecutorManager } from '../../main';
import type { ExecutorImpl } from '../../main/ExecutorImpl';
import retryFulfilled from '../../main/plugin/retryFulfilled';
import { noop } from '../../main/utils';

jest.useFakeTimers();

describe('retryFulfilled', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('retries a fulfilled executor', async () => {
    const taskMock = jest.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled(2, 0)]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.toPromise();
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);
    await executor.toPromise();
    expect(executor.isPending).toBe(false);

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);
    await executor.toPromise();
    expect(executor.isPending).toBe(false);

    // Retry 3
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(3);
  });

  test('stops retrying if an executor is aborted', async () => {
    const taskMock = jest.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled(2, 0)]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.toPromise();
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);

    (executor as ExecutorImpl)._promise!.catch(noop);
    executor.abort();

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('stops retrying if an executor is rejected', async () => {
    const taskMock = jest.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled(2, 0)]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.toPromise();
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);

    (executor as ExecutorImpl)._promise!.catch(noop);
    executor.reject(undefined);

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('stops retrying if an executor is deactivated', async () => {
    const taskMock = jest.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryFulfilled(2, 0)]);

    const deactivate = executor.activate();
    expect(executor.isPending).toBe(true);
    await executor.toPromise();
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);

    deactivate();
    await executor.toPromise();

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });
});

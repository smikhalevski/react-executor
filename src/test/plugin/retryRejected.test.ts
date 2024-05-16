import { ExecutorManager } from '../../main';
import type { ExecutorImpl } from '../../main/ExecutorImpl';
import retryRejected from '../../main/plugin/retryRejected';
import { noop } from '../../main/utils';

jest.useFakeTimers();

describe('retryRejected', () => {
  const expectedReason = new Error('expected');

  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('retries a rejected executor', async () => {
    const taskMock = jest.fn(() => {
      throw expectedReason;
    });

    const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected(2, 0)]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);
    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);
    expect(executor.isPending).toBe(false);

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);
    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);
    expect(executor.isPending).toBe(false);

    // Retry 3
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(3);
  });

  test('stops retrying if an executor is aborted', async () => {
    const taskMock = jest.fn(() => {
      throw expectedReason;
    });

    const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected(2, 0)]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);

    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    executor.abort();

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('stops retrying if an executor is fulfilled', async () => {
    const taskMock = jest.fn(() => {
      throw expectedReason;
    });

    const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected(2, 0)]);

    executor.activate();
    expect(executor.isPending).toBe(true);
    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);

    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    executor.resolve(undefined);

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('stops retrying if an executor is deactivated', async () => {
    const taskMock = jest.fn(() => {
      throw expectedReason;
    });

    const executor = manager.getOrCreate<any>('xxx', taskMock, [retryRejected(2, 0)]);

    const deactivate = executor.activate();
    expect(executor.isPending).toBe(true);
    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);
    expect(executor.isPending).toBe(false);

    // Retry 1
    jest.runAllTimers();
    expect(executor.isPending).toBe(true);

    deactivate();

    (executor as ExecutorImpl)._taskPromise!.catch(noop);
    await executor.toPromise().then(noop, noop);

    // Retry 2
    jest.runAllTimers();
    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, test, beforeEach, vi, Mock } from 'vitest';
import { AbortablePromise } from 'parallel-universe';
import { ExecutorImpl } from '../main/ExecutorImpl';
import { AbortError, noop } from '../main/utils';

Date.now = () => 50;

describe('ExecutorImpl', () => {
  const expectedReason = new Error('expected');

  let listenerMock: Mock;
  let executor: ExecutorImpl<string | number>;

  beforeEach(() => {
    listenerMock = vi.fn();
    executor = new ExecutorImpl('xxx', null!);
    executor.subscribe(listenerMock);
  });

  describe('new', () => {
    test('creates a blank executor', () => {
      expect(listenerMock).not.toHaveBeenCalled();
      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();
    });
  });

  describe('get', () => {
    test('throws if the executor is not settled', () => {
      expect(() => executor.get()).toThrow(new Error('The executor is not settled'));
    });

    test('returns the value of a fulfilled executor', () => {
      executor.resolve('aaa');

      expect(executor.get()).toBe('aaa');
    });

    test('throws the reason of a rejected executor', () => {
      executor.reject(expectedReason);

      expect(() => executor.get()).toThrow(expectedReason);
    });
  });

  describe('getOrDefault', () => {
    test('returns the default value if the executor is not settled', () => {
      expect(executor.getOrDefault('aaa')).toBe('aaa');
    });

    test('returns the value of a fulfilled executor', () => {
      executor.resolve('aaa');

      expect(executor.getOrDefault('bbb')).toBe('aaa');
    });

    test('returns the default value is the executor is rejected', () => {
      executor.reject(expectedReason);

      expect(executor.getOrDefault('aaa')).toBe('aaa');
    });
  });

  describe('execute', () => {
    test('executes a task', async () => {
      const taskMock = vi.fn((_signal, _executor) => 'aaa');
      const promise = executor.execute(taskMock);

      expect(executor.task).toBe(taskMock);

      expect(taskMock).toHaveBeenCalledTimes(1);
      expect(taskMock.mock.calls[0][0].aborted).toBe(false);
      expect(taskMock.mock.calls[0][1]).toBe(executor);

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });

      expect(executor.promise).toBe(promise);

      await expect(promise).resolves.toEqual('aaa');

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 2 });

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('aaa');
      expect(executor.promise).toBeNull();
    });

    test('aborts the pending task if a new task is submitted', async () => {
      const taskMock1 = vi.fn(_signal => 'aaa');
      const taskMock2 = vi.fn(_signal => 'bbb');

      const promise1 = executor.execute(taskMock1);

      const promise2 = executor.execute(taskMock2);

      expect(executor.task).toBe(taskMock2);
      expect(taskMock1.mock.calls[0][0].aborted).toBe(true);
      expect(taskMock2.mock.calls[0][0].aborted).toBe(false);

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor, version: 1 });

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.promise).toBe(promise2);

      await expect(promise2).resolves.toEqual('bbb');

      await expect(promise1).rejects.toEqual(AbortError('The task was replaced'));

      expect(listenerMock).toHaveBeenCalledTimes(4);
      expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor, version: 2 });

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('bbb');
      expect(executor.promise).toBeNull();
    });

    test('rejects if a task throws an error', async () => {
      const taskMock = vi.fn(() => {
        throw expectedReason;
      });
      const promise = executor.execute(taskMock);

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });

      expect(executor.promise).toBe(promise);

      await expect(promise).rejects.toBe(expectedReason);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'rejected', target: executor, version: 2 });

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(true);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBe(expectedReason);
      expect(executor.promise).toBeNull();
    });

    test('task promise can be aborted', () => {
      const taskMock = vi.fn((_signal, _executor) => 'aaa');

      const promise = executor.execute(taskMock);

      promise.catch(noop);
      promise.abort();

      expect(executor.task).toBe(taskMock);

      expect(taskMock).toHaveBeenCalledTimes(1);
      expect(taskMock.mock.calls[0][0].aborted).toBe(true);
      expect(taskMock.mock.calls[0][1]).toBe(executor);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 2 });

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();
    });

    test('a new task can be executed from abort event handler if previous task is aborted manually', async () => {
      const taskMock1 = vi.fn(_signal => 'aaa');
      const taskMock2 = vi.fn(_signal => 'bbb');

      executor.subscribe(event => {
        if (event.type === 'aborted') {
          executor.execute(taskMock2);
        }
      });

      const promise = executor.execute(taskMock1);

      promise.catch(noop);
      promise.abort();

      expect(executor.task).toBe(taskMock2);
      expect(executor.promise).not.toBeNull();
      expect(executor.promise).not.toBe(promise);

      expect(taskMock1).toHaveBeenCalledTimes(1);
      expect(taskMock1.mock.calls[0][0].aborted).toBe(true);

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 2 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'pending', target: executor, version: 3 });

      await expect(executor.promise).resolves.toBe('bbb');

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('bbb');
      expect(executor.reason).toBeUndefined();
    });

    test('a new task can be executed from abort event handler if a task is replaced', async () => {
      const taskMock1 = vi.fn(_signal => 'aaa');
      const taskMock2 = vi.fn(_signal => 'bbb');
      const taskMock3 = vi.fn(_signal => 'ccc');

      listenerMock.mockImplementationOnce(noop).mockImplementationOnce(event => {
        if (event.type === 'aborted') {
          executor.execute(taskMock3);
        }
      });

      const promise1 = executor.execute(taskMock1);
      promise1.catch(noop);

      const promise2 = executor.execute(taskMock2);
      promise2.catch(noop);

      expect(executor.task).toBe(taskMock3);
      expect(executor.promise).not.toBeNull();
      expect(executor.promise).not.toBe(promise1);
      expect(executor.promise).not.toBe(promise2);

      expect(taskMock1).toHaveBeenCalledTimes(1);
      expect(taskMock2).toHaveBeenCalledTimes(1);
      expect(taskMock1.mock.calls[0][0].aborted).toBe(true);
      expect(taskMock2.mock.calls[0][0].aborted).toBe(true);

      expect(listenerMock).toHaveBeenCalledTimes(4);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'aborted', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'pending', target: executor, version: 1 });

      await expect(executor.promise).resolves.toBe('ccc');

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('ccc');
      expect(executor.reason).toBeUndefined();
    });

    test('an AbortablePromise returned from a task is aborted when a task is replaced', async () => {
      const taskMock1 = vi.fn(
        _signal =>
          new AbortablePromise<string>(resolve => {
            resolve('aaa');
          })
      );
      const taskMock2 = vi.fn(_signal => 'bbb');

      const promise1 = executor.execute(taskMock1);
      const promise2 = executor.execute(taskMock2);

      expect(executor.task).toBe(taskMock2);

      expect(taskMock1).toHaveBeenCalledTimes(1);
      expect(taskMock1.mock.calls[0][0].aborted).toBe(true);

      await expect(promise1).rejects.toEqual(AbortError('The task was replaced'));
      await expect(promise2).resolves.toBe('bbb');

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('bbb');
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();
    });

    test('preserves the previous value when a new task is executed', async () => {
      await executor.execute(() => 'aaa');
      const promise = executor.execute(() => 'bbb');

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('aaa');
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBe(promise);

      await promise;

      expect(executor.value).toBe('bbb');
      expect(executor.promise).toBeNull();
    });

    test('preserves the previous reason when a new task is executed', async () => {
      await executor
        .execute(() => {
          throw expectedReason;
        })
        .catch(noop);

      const promise = executor.execute(() => 'bbb');

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(true);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBe(expectedReason);
      expect(executor.promise).toBe(promise);

      await promise;

      expect(executor.value).toBe('bbb');
      expect(executor.promise).toBeNull();
    });
  });

  describe('resolve', () => {
    test('synchronously fulfills the executor', () => {
      executor.resolve('aaa');

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBe('aaa');
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
    });

    test('aborts pending task and preserves it as the latest task', () => {
      const taskMock = vi.fn((_signal, _executor) => 'aaa');

      executor.execute(taskMock).catch(noop);
      executor.resolve('bbb');

      expect(taskMock).toHaveBeenCalledTimes(1);
      expect(taskMock.mock.calls[0][0].aborted).toBe(true);
      expect(taskMock.mock.calls[0][1]).toBe(executor);

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBe('bbb');
      expect(executor.reason).toBeUndefined();
      expect(executor.task).toBe(taskMock);
      expect(executor.promise).toBeNull();

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 2 });
    });

    test('resets invalidated', () => {
      executor.resolve('aaa');
      executor.invalidate();

      expect(executor.isInvalidated).toBe(true);

      executor.resolve('bbb');

      expect(executor.isInvalidated).toBe(false);
    });

    test('executes a new task if resolved with a promise', async () => {
      executor.resolve(Promise.resolve('aaa'));

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();
      expect(executor.task).not.toBeNull();
      expect(executor.promise).not.toBeNull();

      await executor.promise;

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 2 });

      expect(executor.value).toBe('aaa');
      expect(executor.reason).toBeUndefined();
      expect(executor.task).not.toBeNull();
      expect(executor.promise).toBeNull();
    });
  });

  describe('reject', () => {
    test('synchronously rejects the executor', () => {
      executor.reject('aaa');

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(true);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBe('aaa');
      expect(executor.promise).toBeNull();

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'rejected', target: executor, version: 1 });
    });

    test('aborts pending task and preserves it as the latest task', () => {
      const taskMock = vi.fn((_signal, _executor) => 'aaa');

      executor.execute(taskMock).catch(noop);
      executor.reject('bbb');

      expect(taskMock).toHaveBeenCalledTimes(1);
      expect(taskMock.mock.calls[0][0].aborted).toBe(true);
      expect(taskMock.mock.calls[0][1]).toBe(executor);

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(true);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBe('bbb');
      expect(executor.task).toBe(taskMock);
      expect(executor.promise).toBeNull();

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'rejected', target: executor, version: 2 });
    });

    test('resets invalidated', () => {
      executor.resolve('aaa');
      executor.invalidate();

      expect(executor.isInvalidated).toBe(true);

      executor.reject('bbb');

      expect(executor.isInvalidated).toBe(false);
    });
  });

  describe('retry', () => {
    test('no-op if there is no task', () => {
      executor.retry();

      expect(executor.promise).toBeNull();
    });

    test('no-op if there is a pending task', () => {
      const task = () => 'aaa';
      const promise = executor.execute(task);

      executor.retry();

      expect(executor.task).toBe(task);
      expect(executor.promise).toBe(promise);
    });

    test('executes the latest task', async () => {
      const taskMock = vi.fn(() => 'aaa');

      await executor.execute(taskMock);

      expect(taskMock).toHaveBeenCalledTimes(1);

      executor.retry();

      expect(taskMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    test('no-op if executor is not settled', () => {
      executor.clear();

      expect(listenerMock).toHaveBeenCalledTimes(0);
    });

    test('clears the executor', () => {
      executor.resolve('aaa');
      executor.invalidate();
      executor.clear();

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'invalidated', target: executor, version: 2 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'cleared', target: executor, version: 3 });
    });

    test('preserves the pending task intact', () => {
      executor.resolve('aaa');

      const promise = executor.execute(() => 'bbb');

      executor.clear();

      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBe(promise);
    });
  });

  describe('invalidate', () => {
    test('no-op if executor is not settled', () => {
      executor.invalidate();

      expect(listenerMock).toHaveBeenCalledTimes(0);
    });

    test('marks executor as invalidated only once', () => {
      executor.resolve('aaa');
      executor.invalidate();
      executor.invalidate();
      executor.invalidate();

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.isInvalidated).toBe(true);
      expect(executor.value).toBe('aaa');
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'fulfilled', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'invalidated', target: executor, version: 2 });
    });
  });

  describe('abort', () => {
    test('no-op if there is no pending task', () => {
      executor.abort();

      expect(listenerMock).toHaveBeenCalledTimes(0);
    });

    test('aborts the pending task', async () => {
      const taskMock = vi.fn(_signal => 'aaa');

      executor.execute(taskMock).catch(noop);
      executor.abort('bbb');

      expect(executor.task).toBe(taskMock);

      expect(taskMock).toHaveBeenCalledTimes(1);
      expect(taskMock.mock.calls[0][0].aborted).toBe(true);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'pending', target: executor, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'aborted', target: executor, version: 2 });

      expect(executor.promise).toBeNull();
    });

    test('abort preserves the value intact', () => {
      executor.resolve('aaa');
      executor.execute(() => 'bbb').catch(noop);
      executor.abort();

      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe('aaa');
      expect(executor.reason).toBeUndefined();
      expect(executor.promise).toBeNull();
    });

    test('abort preserves reason intact', () => {
      executor.reject(expectedReason);
      executor.execute(() => 'bbb').catch(noop);
      executor.abort();

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(executor.isPending).toBe(false);
      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(true);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBe(expectedReason);
      expect(executor.promise).toBeNull();
    });
  });

  describe('activate', () => {
    test('marks executor as activated', () => {
      executor.activate();
      executor.activate();
      executor.activate();

      expect(executor._activationCount).toBe(3);

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'activated', target: executor, version: 0 });
    });

    test('marks executor as deactivated', () => {
      const deactivate = executor.activate();

      deactivate();
      deactivate();
      deactivate();

      expect(executor._activationCount).toBe(0);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'activated', target: executor, version: 0 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'deactivated', target: executor, version: 0 });
    });
  });

  describe('getOrAwait', () => {
    test('resolves with the value if an executor is fulfilled', async () => {
      executor.resolve('aaa');

      await expect(executor.getOrAwait()).resolves.toBe('aaa');
    });

    test('rejects with the reason if an executor is fulfilled', async () => {
      executor.reject(expectedReason);

      await expect(executor.getOrAwait()).rejects.toBe(expectedReason);
    });

    test('waits for the executor to be fulfilled', async () => {
      const promise = executor.getOrAwait();

      executor.resolve('aaa');

      await expect(promise).resolves.toBe('aaa');
    });

    test('waits for the executor to be rejected', async () => {
      const promise = executor.getOrAwait();

      executor.reject(expectedReason);

      await expect(promise).rejects.toBe(expectedReason);
    });

    test('waits until the executor is settled and non-pending', async () => {
      executor.resolve('aaa');
      executor.execute(() => 'bbb').catch(noop);

      const promise = executor.getOrAwait();

      executor.execute(() => 'ccc');

      await expect(promise).resolves.toBe('ccc');
    });
  });

  describe('toJSON', () => {
    test('returns an executor state', () => {
      executor.resolve(111);

      expect(executor.toJSON()).toEqual({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      });
    });

    test('used by JSON.stringify', () => {
      executor.resolve(111);

      expect(JSON.stringify(executor)).toBe(
        '{"key":"xxx","isFulfilled":true,"value":111,"annotations":{},"settledAt":50,"invalidatedAt":0}'
      );
    });
  });
});

import { ExecutorImpl } from '../main/ExecutorImpl';

export function noop(): void {}

describe('ExecutorImpl', () => {
  let listenerMock: jest.Mock;
  let executor: ExecutorImpl<string | number>;

  beforeEach(() => {
    listenerMock = jest.fn();
    executor = new ExecutorImpl('', null!);
    executor.subscribe(listenerMock);
  });

  test('creates a blank executor', () => {
    expect(listenerMock).not.toHaveBeenCalled();
    expect(executor.isSettled).toBe(false);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('invokes a callback with a signal', async () => {
    const cbMock = jest.fn(signal => 'aaa');
    const promise = executor.execute(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    await expect(promise).resolves.toEqual('aaa');
  });

  test('resolves execution', async () => {
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(promise);

    await expect(promise).resolves.toBe(111);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('rejects execution', async () => {
    const promise = executor.execute(() => Promise.reject(222));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(promise);

    await expect(promise).rejects.toEqual(222);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor._promise).toBe(null);
  });

  test('notifies the listener on sequential executions', () => {
    executor.execute(() => Promise.resolve(111)).catch(noop);
    executor.execute(() => Promise.resolve(222));

    expect(listenerMock).toHaveBeenCalledTimes(3);
  });

  test('aborts pending execution if new execution is submitted', async () => {
    const cbMock = jest.fn(signal => Promise.resolve(111));

    const promise1 = executor.execute(cbMock);

    const promise2 = executor.execute(() => Promise.resolve(222));

    expect(cbMock.mock.calls[0][0].aborted).toBe(true);
    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isSettled).toBe(false);
    expect(executor.value).toBe(undefined);

    await expect(promise2).resolves.toEqual(222);

    await expect(promise1).rejects.toEqual(new DOMException('The operation was aborted.', 'AbortError'));

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(executor.value).toBe(222);
  });

  test('synchronously resolves', () => {
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('asynchronously resolves', async () => {
    executor.resolve(Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBeInstanceOf(Promise);

    await executor._promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('synchronously rejects', () => {
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor._promise).toBe(null);
  });

  test('stores only the last value', () => {
    executor.reject(222);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('stores only the last reason', () => {
    executor.resolve(111);
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor._promise).toBe(null);
  });

  test('preserves the previous value on execute', () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(promise);
  });

  test('preserves the previous reason on execute', () => {
    executor.reject(222);
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor._promise).toBe(promise);
  });

  // test('does not invoke listener if a value did not change after resolve', () => {
  //   executor.resolve(111);
  //   executor.resolve(111);
  //
  //   expect(listenerMock).toHaveBeenCalledTimes(2);
  // });

  // test('does not invoke listener if a reason did not change after reject', () => {
  //   executor.reject(222);
  //   executor.reject(222);
  //
  //   expect(listenerMock).toHaveBeenCalledTimes(1);
  // });

  test('clears after resolve', () => {
    executor.resolve(111);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('clears after reject', () => {
    executor.reject(222);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('clear does not interrupt execution', async () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(333);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('abort preserves the value intact', () => {
    executor.resolve(111);
    executor.execute(() => Promise.resolve(333)).catch(noop);
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('abort preserves reason intact', () => {
    executor.reject(222);
    executor.execute(() => Promise.resolve(111)).catch(noop);
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor._promise).toBe(null);
  });

  test('aborts a pending execution', async () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));
    executor.abort();
    await promise.catch(noop);

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor._promise).toBe(null);
  });

  test('returns a default value if an executor is not fulfilled', () => {
    expect(executor.getOrDefault(222)).toBe(222);
  });

  test('returns a value if an executor is fulfilled', () => {
    executor.resolve(111);
    expect(executor.getOrDefault(222)).toBe(111);
  });
});

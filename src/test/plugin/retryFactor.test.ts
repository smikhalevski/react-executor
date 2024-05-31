import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import retryFactor from '../../main/plugin/retryFactor';

jest.useFakeTimers();

describe('retryFactor', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('retries an active executor', async () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

    const executor = manager.getOrCreate('xxx', taskMock, [retryFactor(pubSub)]);

    executor.activate();

    await expect(executor.getOrAwait()).resolves.toBe('aaa');

    pubSub.publish(false);

    jest.runAllTimers();

    expect(executor.isPending).toBe(false);

    pubSub.publish(true);

    expect(executor.isPending).toBe(true);
    expect(executor.value).toBe('aaa');

    await expect(executor.getOrAwait()).resolves.toBe('bbb');

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  test('does not retry a non-active executor', async () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

    const executor = manager.getOrCreate('xxx', taskMock, [retryFactor(pubSub)]);

    await expect(executor.getOrAwait()).resolves.toBe('aaa');

    pubSub.publish(false);

    jest.runAllTimers();

    expect(executor.isPending).toBe(false);

    pubSub.publish(true);

    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(1);
  });

  test('does not retry if factor was enabled before timeout', async () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

    const executor = manager.getOrCreate('xxx', taskMock, [retryFactor(pubSub, 10_000)]);

    executor.activate();

    await expect(executor.getOrAwait()).resolves.toBe('aaa');

    pubSub.publish(false);

    jest.advanceTimersByTime(5_000);

    expect(executor.isPending).toBe(false);

    pubSub.publish(true);

    expect(executor.isPending).toBe(false);

    jest.runAllTimers();

    expect(executor.isPending).toBe(false);

    expect(taskMock).toHaveBeenCalledTimes(1);
  });

  test('retries if factor was enabled after timeout', async () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

    const executor = manager.getOrCreate('xxx', taskMock, [retryFactor(pubSub, 5_000)]);

    executor.activate();

    await expect(executor.getOrAwait()).resolves.toBe('aaa');

    pubSub.publish(false);

    jest.advanceTimersByTime(10_000);

    expect(executor.isPending).toBe(false);

    pubSub.publish(true);

    expect(executor.isPending).toBe(true);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });
});

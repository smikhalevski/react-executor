import { beforeEach, expect, test, vi } from 'vitest';
import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main/index.js';
import retryWhen from '../../main/plugin/retryWhen.js';

vi.useFakeTimers();

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('retries an active executor', async () => {
  const pubSub = new PubSub<boolean>();

  const taskMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', taskMock, [retryWhen(pubSub)]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  pubSub.publish(true);

  vi.runAllTimers();

  expect(executor.isPending).toBe(true);
  expect(executor.value).toBe('aaa');

  await expect(executor.getOrAwait()).resolves.toBe('bbb');

  expect(taskMock).toHaveBeenCalledTimes(2);
});

test('does not retry a non-active executor', async () => {
  const pubSub = new PubSub<boolean>();

  const taskMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', taskMock, [retryWhen(pubSub)]);

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  pubSub.publish(true);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  expect(taskMock).toHaveBeenCalledTimes(1);
});

test('does not retry if observable has pushed false before timeout', async () => {
  const pubSub = new PubSub<boolean>();

  const taskMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', taskMock, [retryWhen(pubSub, { delay: 10_000 })]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(true);

  vi.advanceTimersByTime(5_000);

  expect(executor.isPending).toBe(false);

  pubSub.publish(false);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  expect(taskMock).toHaveBeenCalledTimes(1);
});

test('retries if observable has pushed true after timeout', async () => {
  const pubSub = new PubSub<boolean>();

  const taskMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', taskMock, [retryWhen(pubSub, { delay: 5_000 })]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);

  vi.advanceTimersByTime(10_000);

  expect(executor.isPending).toBe(false);

  pubSub.publish(true);

  vi.runAllTimers();

  expect(executor.isPending).toBe(true);

  expect(taskMock).toHaveBeenCalledTimes(2);
});

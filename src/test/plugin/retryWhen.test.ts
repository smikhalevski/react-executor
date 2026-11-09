import { beforeEach, expect, test, vi } from 'vitest';
import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main/index.js';
import retryWhen from '../../main/plugin/retryWhen.js';
import { noop } from '../../main/utils.js';

vi.useFakeTimers();

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('retries an active executor', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', callbackMock, [retryWhen(pubSub)]);

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

  expect(callbackMock).toHaveBeenCalledTimes(2);
});

test('does not retry a non-active executor', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', callbackMock, [retryWhen(pubSub)]);

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  pubSub.publish(true);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('does not retry if observable has pushed false before timeout', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', callbackMock, [retryWhen(pubSub, { delay: 10_000 })]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);
  pubSub.publish(true);

  vi.advanceTimersByTime(5_000);

  expect(executor.isPending).toBe(false);

  pubSub.publish(false);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('retries after timeout if observable has pushed true', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', callbackMock, [retryWhen(pubSub, { delay: 5_000 })]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);
  pubSub.publish(true);

  vi.advanceTimersByTime(4_999);

  expect(executor.isPending).toBe(false);

  vi.advanceTimersByTime(1);

  expect(executor.isPending).toBe(true);

  expect(callbackMock).toHaveBeenCalledTimes(2);
});

test('does not retry if observable has not pushed false', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', callbackMock, [retryWhen(pubSub)]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(true);

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(1);
});

test('does not cancel a retry if observable pushes true again', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');

  const executor = manager.getOrCreate('xxx', callbackMock, [retryWhen(pubSub, { delay: 5_000 })]);

  executor.activate();

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  pubSub.publish(false);
  pubSub.publish(true);
  pubSub.publish(true);

  vi.runAllTimers();

  expect(callbackMock).toHaveBeenCalledTimes(2);
});

test('does not retry if executor is fulfilled before timeout', async () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', noop, [retryWhen(pubSub, { delay: 5_000 })]);

  executor.activate();

  await executor.getOrAwait();

  pubSub.publish(false);
  pubSub.publish(true);

  executor.resolve(undefined);

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);
});

test('retries a non-active executor after it is activated', async () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', noop, [retryWhen(pubSub)]);

  await executor.getOrAwait();

  pubSub.publish(false);
  pubSub.publish(true);

  vi.runAllTimers();

  executor.activate();

  expect(executor.isPending).toBe(true);
});

test('retries a non-active executor if isEager is true', async () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', noop, [retryWhen(pubSub, { isEager: true })]);

  await executor.getOrAwait();

  pubSub.publish(false);
  pubSub.publish(true);

  vi.runAllTimers();

  expect(executor.isPending).toBe(true);
});

test('does not retry if executor is pending when observable pushes true', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', () => new Promise(noop), [retryWhen(pubSub)]);

  executor.activate();

  pubSub.publish(false);
  pubSub.publish(true);

  // The executor is no longer pending, so a scheduled retry would be executed
  executor.abort();

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);
});

test('unsubscribes from the observable when the executor is detached', () => {
  const pubSub = new PubSub<boolean>();

  manager.getOrCreate('xxx', undefined, [retryWhen(pubSub)]);

  manager.detach('xxx');

  expect(pubSub.listenerCount).toBe(0);
});

test('does not retry the executor after it is detached', async () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', noop, [retryWhen(pubSub, { isEager: true })]);

  await executor.getOrAwait();

  pubSub.publish(false);
  pubSub.publish(true);

  manager.detach('xxx');

  vi.runAllTimers();

  expect(executor.isPending).toBe(false);
});

import { beforeEach, expect, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.ts';
import abortWhen from '../../main/plugin/abortWhen.ts';
import { PubSub } from '../../main/PubSub.ts';
import { noop } from '../../main/utils.ts';
import { sleep } from '../test-utils.ts';

vi.useFakeTimers();

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('aborts the pending task', () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn(_signal => new Promise(noop));

  manager.getOrCreate('xxx', callbackMock, [abortWhen(pubSub)]);

  pubSub.publish(true);

  vi.advanceTimersByTime(5_000);

  expect(callbackMock.mock.calls[0][0].aborted).toBe(true);
});

test('does not abort the executed task by default', () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn();

  const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

  pubSub.publish(true);

  vi.runAllTimers();

  executor.execute(callbackMock);

  expect(callbackMock.mock.calls[0][0].aborted).toBe(false);
});

test('aborts the executed task if isSustained is true', () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn();

  const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub, { isSustained: true })]);

  pubSub.publish(true);

  vi.runAllTimers();

  executor.execute(callbackMock);

  expect(callbackMock.mock.calls[0][0].aborted).toBe(true);
});

test('does not abort the executed task if isSustained is true and the observable has pushed false', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub, { isSustained: true })]);

  pubSub.publish(true);

  vi.runAllTimers();

  pubSub.publish(false);

  executor.execute(() => new Promise(noop));

  expect(executor.isPending).toBe(true);
});

test('aborts the pending task after the delay', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', () => new Promise(noop), [abortWhen(pubSub, { delay: 5_000 })]);

  pubSub.publish(true);

  vi.advanceTimersByTime(4_999);

  expect(executor.isPending).toBe(true);

  vi.advanceTimersByTime(1);

  expect(executor.isPending).toBe(false);
});

test('does not abort if the observable has pushed false before the timeout', async () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn(_signal => sleep(15_000, 'aaa'));

  const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub, { delay: 10_000 })]);

  executor.execute(callbackMock);

  pubSub.publish(true);

  vi.advanceTimersByTime(5_000);

  pubSub.publish(false);

  vi.advanceTimersByTime(20_000);

  await expect(executor.getOrAwait()).resolves.toBe('aaa');

  expect(callbackMock.mock.calls[0][0].aborted).toBe(false);
});

test('does not abort if the observable has pushed false after pushing true twice', () => {
  const pubSub = new PubSub<boolean>();

  const callbackMock = vi.fn(_signal => sleep(15_000, 'aaa'));

  const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

  executor.execute(callbackMock);

  pubSub.publish(true);
  pubSub.publish(true);
  pubSub.publish(false);

  vi.advanceTimersToNextTimer();

  expect(callbackMock.mock.calls[0][0].aborted).toBe(false);
});

test('unsubscribes from the observable when the executor is detached', () => {
  const pubSub = new PubSub<boolean>();

  manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

  manager.detach('xxx');

  expect(pubSub.listenerCount).toBe(0);
});

test('does not abort the pending task after the executor is detached', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', () => new Promise(noop), [abortWhen(pubSub)]);

  pubSub.publish(true);

  manager.detach('xxx');

  vi.runAllTimers();

  expect(executor.isPending).toBe(true);
});

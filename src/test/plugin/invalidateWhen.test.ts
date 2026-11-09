import { beforeEach, expect, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import invalidateWhen from '../../main/plugin/invalidateWhen.js';
import { PubSub } from '../../main/PubSub.js';

vi.useFakeTimers();

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('invalidates an executor', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub)]);

  pubSub.publish(false);

  expect(executor.isInvalidated).toBe(false);

  pubSub.publish(true);

  expect(executor.isInvalidated).toBe(true);
});

test('does not invalidate before grace period expires', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub, { delay: 10_000 })]);

  pubSub.publish(false);

  vi.advanceTimersByTime(5_000);

  pubSub.publish(true);

  expect(executor.isInvalidated).toBe(false);
});

test('invalidates after grace period expires', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub, { delay: 10_000 })]);

  pubSub.publish(false);

  vi.advanceTimersByTime(5_000);

  // Grace period is counted from the first false
  pubSub.publish(false);

  vi.advanceTimersByTime(5_000);

  pubSub.publish(true);

  expect(executor.isInvalidated).toBe(true);
});

test('does not invalidate an executor if observable has not pushed false', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub)]);

  pubSub.publish(true);

  expect(executor.isInvalidated).toBe(false);
});

test('does not invalidate an executor if observable pushes true again', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub)]);

  pubSub.publish(false);
  pubSub.publish(true);

  executor.resolve(222);

  pubSub.publish(true);

  expect(executor.isInvalidated).toBe(false);
});

test('unsubscribes from the observable when the executor is detached', () => {
  const pubSub = new PubSub<boolean>();

  manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub)]);

  manager.detach('xxx');

  expect(pubSub.listenerCount).toBe(0);
});

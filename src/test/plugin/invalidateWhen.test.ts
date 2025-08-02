import { beforeEach, expect, test, vi } from 'vitest';
import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main/index.js';
import invalidateWhen from '../../main/plugin/invalidateWhen.js';

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

test('does not invalidate before brace period expires', () => {
  const pubSub = new PubSub<boolean>();

  const executor = manager.getOrCreate('xxx', 111, [invalidateWhen(pubSub, { delay: 10_000 })]);

  pubSub.publish(false);

  vi.advanceTimersByTime(5_000);

  pubSub.publish(true);

  expect(executor.isInvalidated).toBe(false);
});

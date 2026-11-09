import { beforeEach, expect, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import detachInactive from '../../main/plugin/detachInactive.js';

vi.useFakeTimers();

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('detaches an executor that was not activated during delayBeforeActivated', () => {
  const executor = manager.getOrCreate('xxx', undefined, [detachInactive({ delayBeforeActivated: 5_000 })]);

  vi.advanceTimersByTime(4_999);

  expect(manager.get('xxx')).toBe(executor);

  vi.advanceTimersByTime(1);

  expect(manager.get('xxx')).toBeUndefined();
});

test('does not detach an executor that was activated during delayBeforeActivated', () => {
  const executor = manager.getOrCreate('xxx', undefined, [detachInactive({ delayBeforeActivated: 5_000 })]);
  const deactivate = executor.activate();

  deactivate();

  vi.runAllTimers();

  expect(manager.get('xxx')).toBe(executor);
});

test('does not detach a new executor with the same key after the executor is detached', () => {
  manager.getOrCreate('xxx', undefined, [detachInactive({ delayBeforeActivated: 5_000 })]);

  manager.detach('xxx');

  const executor = manager.getOrCreate('xxx');

  vi.runAllTimers();

  expect(manager.get('xxx')).toBe(executor);
});

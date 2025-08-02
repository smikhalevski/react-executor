import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import retryActivated from '../../main/plugin/retryActivated.js';

vi.useFakeTimers();

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('retries an activated executor', async () => {
  const taskMock = vi.fn();
  const executor = manager.getOrCreate('xxx', taskMock, [retryActivated()]);

  await executor.getOrAwait();

  expect(executor.isPending).toBe(false);

  executor.activate();

  expect(executor.isPending).toBe(true);
});

test('does not retry if executor is not stale yet', async () => {
  const taskMock = vi.fn();
  const executor = manager.getOrCreate('xxx', taskMock, [retryActivated({ delayAfterSettled: 5_000 })]);

  await executor.getOrAwait();

  const deactivate = executor.activate();

  expect(executor.isPending).toBe(false);

  deactivate();

  vi.setSystemTime(Date.now() + 5_000);

  executor.activate();

  expect(executor.isPending).toBe(true);
});

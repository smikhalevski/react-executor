import { expect, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import lazyTask from '../../main/plugin/lazyTask.js';

test('sets a task and does not execute it', async () => {
  const taskMock = vi.fn(() => 'aaa');

  const executor = new ExecutorManager().getOrCreate('xxx', undefined, [lazyTask(taskMock)]);

  expect(taskMock).not.toHaveBeenCalled();
  expect(executor.task).toBe(taskMock);
});

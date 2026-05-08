import { expect, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import lazyTask from '../../main/plugin/lazyTask.js';

test('sets a task and does not execute it', async () => {
  const callbackMock = vi.fn(() => 'aaa');

  const executor = new ExecutorManager().getOrCreate('xxx', undefined, [lazyTask(callbackMock)]);

  expect(callbackMock).not.toHaveBeenCalled();
  expect(executor.task).toStrictEqual({ callback: callbackMock });
});

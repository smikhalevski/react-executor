import { expect, test, vi } from 'vitest';
import { ExecutorManager } from '../../main/index.ts';
import lazyTask from '../../main/plugin/lazyTask.ts';
import { noop } from '../../main/utils.ts';

test('sets a task and does not execute it', async () => {
  const callbackMock = vi.fn(() => 'aaa');

  const executor = new ExecutorManager().getOrCreate('xxx', undefined, [lazyTask(callbackMock)]);

  expect(callbackMock).not.toHaveBeenCalled();
  expect(executor.task).toStrictEqual({ callback: callbackMock });
});

test('sets a task object as is', () => {
  const task = { callback: noop };

  const executor = new ExecutorManager().getOrCreate('xxx', undefined, [lazyTask(task)]);

  expect(executor.task).toBe(task);
});

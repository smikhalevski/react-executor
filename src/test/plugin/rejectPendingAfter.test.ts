import { beforeEach, expect, test } from 'vitest';
import { delay } from 'parallel-universe';
import { ExecutorManager } from '../../main/index.js';
import rejectPendingAfter from '../../main/plugin/rejectPendingAfter.js';
import { TimeoutError } from '../../main/utils.js';

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('aborts the pending task and rejects the executor', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [rejectPendingAfter(0)]);

  const promise = executor.execute(() => delay(100));

  await expect(promise).rejects.toEqual(TimeoutError('The task execution took too long'));
  expect(executor.isRejected).toBe(true);
  expect(executor.reason).toEqual(TimeoutError('The task execution took too long'));
});

test('does not abort the pending and reject the executor when it is settled before the timeout', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [rejectPendingAfter(100)]);

  const promise = executor.execute(() => delay(0, 'aaa'));

  await expect(promise).resolves.toEqual('aaa');
  expect(executor.isRejected).toBe(false);
});

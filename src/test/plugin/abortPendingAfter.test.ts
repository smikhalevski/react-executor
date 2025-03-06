import { delay } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import abortPendingAfter from '../../main/plugin/abortPendingAfter';
import { TimeoutError } from '../../main/utils';

describe('abortPendingAfter', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('aborts the pending task', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [abortPendingAfter(0)]);

    const promise = executor.execute(() => delay(100));

    await expect(promise).rejects.toEqual(TimeoutError('The task execution took too long'));
    expect(executor.isRejected).toBe(false);
  });

  test('does not abort the pending when it is settled before the timeout', async () => {
    const executor = manager.getOrCreate('xxx', undefined, [abortPendingAfter(100)]);

    const promise = executor.execute(() => delay(0, 'aaa'));

    await expect(promise).resolves.toEqual('aaa');
    expect(executor.isRejected).toBe(false);
  });
});

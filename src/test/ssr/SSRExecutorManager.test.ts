import { SSRExecutorManager } from '../../main/ssr';
import { noop } from '../../main/utils';

Date.now = () => 50;

describe('SSRExecutorManager', () => {
  describe('nextHydrationChunk', () => {
    test('returns undefined if there no changes in state', () => {
      const manager = new SSRExecutorManager();

      manager.getOrCreate('xxx');

      expect(manager.nextHydrationChunk()).toBeUndefined();
    });

    test('returns a hydration chunk', async () => {
      const manager = new SSRExecutorManager();

      const executor = manager.getOrCreate('xxx');

      expect(manager.nextHydrationChunk()).toBeUndefined();

      const promise = executor.execute(() => 111);

      expect(manager.nextHydrationChunk()).toBeUndefined();

      await promise;

      expect(manager.nextHydrationChunk()).toBe(
        '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e)</script>'
      );
    });

    test('returns only changed executor states in consequent hydration chunks', async () => {
      const manager = new SSRExecutorManager();

      const executor1 = manager.getOrCreate('xxx');
      const executor2 = manager.getOrCreate('yyy');

      await executor1.execute(() => 111);

      manager.nextHydrationChunk();

      const promise = executor2.execute(() => 222);

      expect(manager.nextHydrationChunk()).toBeUndefined();

      await promise;

      expect(manager.nextHydrationChunk()).toBe(
        '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"yyy\\",\\"isFulfilled\\":true,\\"value\\":222,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e)</script>'
      );
    });

    test('returns fulfilled executors by default', async () => {
      const manager = new SSRExecutorManager();

      await manager
        .getOrCreate('xxx')
        .execute(() => Promise.reject('expected'))
        .catch(noop);

      expect(manager.nextHydrationChunk()).toBeUndefined();
    });

    test('respects executorFilter option', async () => {
      const manager = new SSRExecutorManager({
        executorFilter: executor => executor.isSettled,
      });

      await manager
        .getOrCreate('xxx')
        .execute(() => Promise.reject('expected'))
        .catch(noop);

      expect(manager.nextHydrationChunk()).toBe(
        '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":false,\\"reason\\":\\"expected\\",\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e)</script>'
      );
    });

    test('respects executorFilter option', async () => {
      const stateStringifierMock = jest.fn(JSON.stringify);

      const manager = new SSRExecutorManager({
        stateStringifier: stateStringifierMock,
      });

      await manager.getOrCreate('xxx', () => 111);

      manager.nextHydrationChunk();

      expect(stateStringifierMock).toHaveBeenCalledTimes(1);
      expect(stateStringifierMock).toHaveBeenNthCalledWith(1, {
        annotations: {},
        invalidatedAt: 0,
        isFulfilled: true,
        key: 'xxx',
        reason: undefined,
        settledAt: 50,
        value: 111,
      });
    });
  });

  describe('hasChanges', () => {
    test('returns false if there are no pending executors', async () => {
      const manager = new SSRExecutorManager();

      await expect(manager.hasChanges()).resolves.toBe(false);
    });

    test('waits for pending executors to finish', async () => {
      const manager = new SSRExecutorManager();

      const executor = manager.getOrCreate('xxx', () => 111);

      await expect(manager.hasChanges()).resolves.toBe(true);

      expect(executor.isPending).toBe(false);
      expect(executor.value).toBe(111);
    });

    test('waits for pending executors to finish', async () => {
      const manager = new SSRExecutorManager();

      const executor = manager.getOrCreate('xxx', () => 111, [
        executor => {
          executor.subscribe(event => {
            if (event.type === 'fulfilled' && executor.value === 111) {
              executor.execute(() => 222);
            }
          });
        },
      ]);
      await expect(manager.hasChanges()).resolves.toBe(true);

      expect(executor.isPending).toBe(false);
      expect(executor.value).toBe(222);
    });
  });

  describe('abort', () => {
    test('aborts executors', () => {
      const manager = new SSRExecutorManager();

      const taskMock = jest.fn(signal => 111);

      const executor = manager.getOrCreate('xxx');

      executor.execute(taskMock).catch(noop);

      manager.abort();

      expect(executor.isPending).toBe(false);
      expect(taskMock.mock.calls[0][0].aborted).toBe(true);
    });
  });
});

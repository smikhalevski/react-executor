import { describe, expect, test, vi } from 'vitest';
import { SSRExecutorManager } from '../../main/ssr/index.js';
import { noop } from '../../main/utils.js';

Date.now = () => 50;

describe('nextHydrationScript', () => {
  test('returns an empty string if there no changes in state', () => {
    const manager = new SSRExecutorManager();

    manager.getOrCreate('xxx');

    expect(manager.nextHydrationScript()).toBe('');
  });

  test('returns the hydration script for a single executor', async () => {
    const manager = new SSRExecutorManager();

    const executor = manager.getOrCreate('xxx');

    expect(manager.nextHydrationScript()).toBe('');

    const promise = executor.execute(() => 111);

    expect(manager.nextHydrationScript()).toBe('');

    await promise;

    expect(manager.nextHydrationScript()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('returns the hydration script for multiple executors', async () => {
    const manager = new SSRExecutorManager();

    const executor1 = manager.getOrCreate('xxx');
    const executor2 = manager.getOrCreate('yyy');

    expect(manager.nextHydrationScript()).toBe('');

    const promise1 = executor1.execute(() => 111);
    const promise2 = executor2.execute(() => 222);

    expect(manager.nextHydrationScript()).toBe('');

    await promise1;
    await promise2;

    expect(manager.nextHydrationScript()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}","{\\"key\\":\\"yyy\\",\\"isFulfilled\\":true,\\"value\\":222,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('returns only changed executor states in consequent hydration scripts', async () => {
    const manager = new SSRExecutorManager();

    const executor1 = manager.getOrCreate('xxx');
    const executor2 = manager.getOrCreate('yyy');

    await executor1.execute(() => 111);

    manager.nextHydrationScript();

    const promise = executor2.execute(() => 222);

    expect(manager.nextHydrationScript()).toBe('');

    await promise;

    expect(manager.nextHydrationScript()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"yyy\\",\\"isFulfilled\\":true,\\"value\\":222,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('returns fulfilled executors by default', async () => {
    const manager = new SSRExecutorManager();

    await manager
      .getOrCreate('xxx')
      .execute(() => Promise.reject('expected'))
      .catch(noop);

    expect(manager.nextHydrationScript()).toBe('');
  });

  test('respects executorFilter option', async () => {
    const manager = new SSRExecutorManager({
      executorFilter: executor => executor.isSettled,
    });

    await manager
      .getOrCreate('xxx')
      .execute(() => Promise.reject('expected'))
      .catch(noop);

    expect(manager.nextHydrationScript()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":false,\\"reason\\":\\"expected\\",\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('respects stateStringifier option', () => {
    const stateStringifierMock = vi.fn(JSON.stringify);

    const manager = new SSRExecutorManager({
      stateStringifier: stateStringifierMock,
    });

    manager.getOrCreate('xxx', 111);

    manager.nextHydrationScript();

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

  test('escapes XSS-prone strings', () => {
    const manager = new SSRExecutorManager();

    manager.getOrCreate('xxx', '<script src="https://xxx.yyy"></script>');

    const source = manager.nextHydrationScript();

    expect(source).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":true,\\"value\\":\\"\\u003Cscript src=\\\\\\"https://xxx.yyy\\\\\\">\\u003C/script>\\",\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });
});

describe('nextHydrationChunk', () => {
  test('returns an empty string if there no changes in state', () => {
    const manager = new SSRExecutorManager();

    manager.getOrCreate('xxx');

    expect(manager.nextHydrationChunk()).toBe('');
  });

  test('returns the hydration chunk for a single executor', async () => {
    const manager = new SSRExecutorManager();

    await manager.getOrCreate('xxx').execute(() => 111);

    expect(manager.nextHydrationChunk()).toBe(
      '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);</script>'
    );
  });

  test('respects nonce', () => {
    const manager = new SSRExecutorManager({ nonce: '111' });

    manager.getOrCreate('xxx', 111);

    const chunk = manager.nextHydrationChunk();

    expect(chunk).toBe(
      '<script nonce="111">(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("{\\"key\\":\\"xxx\\",\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);</script>'
    );
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

    const taskMock = vi.fn(_signal => 111);

    const executor = manager.getOrCreate('xxx');

    executor.execute(taskMock).catch(noop);

    manager.abort();

    expect(executor.isPending).toBe(false);
    expect(taskMock.mock.calls[0][0].aborted).toBe(true);
  });
});

import { describe, expect, test, vi } from 'vitest';
import { SSRExecutorManager } from '../../main/ssr/index.js';
import { noop } from '../../main/utils.js';
import { ExecutorState } from '../../main/index.js';
import { Serializer } from '../../main/types.js';

Date.now = () => 50;

describe('nextHydrationScriptSource', () => {
  test('returns an empty string if there no changes in state', () => {
    const manager = new SSRExecutorManager();

    manager.getOrCreate('xxx');

    expect(manager.nextHydrationScriptSource()).toBe('');
  });

  test('returns the hydration script for a single executor', async () => {
    const manager = new SSRExecutorManager();

    const executor = manager.getOrCreate('xxx');

    expect(manager.nextHydrationScriptSource()).toBe('');

    const promise = executor.execute(() => 111);

    expect(manager.nextHydrationScriptSource()).toBe('');

    await promise;

    expect(manager.nextHydrationScriptSource()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('returns the hydration script for multiple executors', async () => {
    const manager = new SSRExecutorManager();

    const executor1 = manager.getOrCreate('xxx');
    const executor2 = manager.getOrCreate('yyy');

    expect(manager.nextHydrationScriptSource()).toBe('');

    const promise1 = executor1.execute(() => 111);
    const promise2 = executor2.execute(() => 222);

    expect(manager.nextHydrationScriptSource()).toBe('');

    await promise1;
    await promise2;

    expect(manager.nextHydrationScriptSource()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}","\\"yyy\\"","{\\"isFulfilled\\":true,\\"value\\":222,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('returns only changed executor states in consequent hydration scripts', async () => {
    const manager = new SSRExecutorManager();

    const executor1 = manager.getOrCreate('xxx');
    const executor2 = manager.getOrCreate('yyy');

    await executor1.execute(() => 111);

    manager.nextHydrationScriptSource();

    const promise = executor2.execute(() => 222);

    expect(manager.nextHydrationScriptSource()).toBe('');

    await promise;

    expect(manager.nextHydrationScriptSource()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"yyy\\"","{\\"isFulfilled\\":true,\\"value\\":222,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('returns fulfilled executors by default', async () => {
    const manager = new SSRExecutorManager();

    await manager
      .getOrCreate('xxx')
      .execute(() => Promise.reject('expected'))
      .catch(noop);

    expect(manager.nextHydrationScriptSource()).toBe('');
  });

  test('respects executorPredicate option', async () => {
    const manager = new SSRExecutorManager({
      executorPredicate: executor => executor.isSettled,
    });

    await manager
      .getOrCreate('xxx')
      .execute(() => Promise.reject('expected'))
      .catch(noop);

    expect(manager.nextHydrationScriptSource()).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":false,\\"reason\\":\\"expected\\",\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  });

  test('uses a custom serializer', () => {
    const serializerMock: Serializer = {
      parse: vi.fn(JSON.parse),
      stringify: vi.fn(JSON.stringify),
    };

    const manager = new SSRExecutorManager({ serializer: serializerMock });

    manager.getOrCreate('xxx', 111);

    manager.nextHydrationScriptSource();

    expect(serializerMock.parse).not.toHaveBeenCalled();
    expect(serializerMock.stringify).toHaveBeenCalledTimes(2);
    expect(serializerMock.stringify).toHaveBeenNthCalledWith(1, 'xxx');
    expect(serializerMock.stringify).toHaveBeenNthCalledWith(2, {
      annotations: {},
      invalidatedAt: 0,
      isFulfilled: true,
      reason: undefined,
      settledAt: 50,
      value: 111,
    } satisfies ExecutorState);
  });

  test('escapes XSS-prone strings', () => {
    const manager = new SSRExecutorManager();

    manager.getOrCreate('xxx', '<script src="https://xxx.yyy"></script>');

    const source = manager.nextHydrationScriptSource();

    expect(source).toBe(
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":\\"\\u003Cscript src=\\\\\\"https://xxx.yyy\\\\\\">\\u003C/script>\\",\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);'
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
      '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);</script>'
    );
  });

  test('respects nonce', () => {
    const manager = new SSRExecutorManager({ nonce: '111' });

    manager.getOrCreate('xxx', 111);

    const chunk = manager.nextHydrationChunk();

    expect(chunk).toBe(
      '<script nonce="111">(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);</script>'
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

    executor.execute(taskMock);

    manager.abort();

    expect(executor.isPending).toBe(false);
    expect(taskMock.mock.calls[0][0].aborted).toBe(true);
  });
});

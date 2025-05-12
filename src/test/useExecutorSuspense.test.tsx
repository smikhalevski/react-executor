/**
 * @vitest-environment jsdom
 */

import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import React, { Suspense, useEffect } from 'react';
import {
  ExecutorManager,
  ExecutorManagerProvider,
  useExecutor,
  useExecutorSubscription,
  useExecutorSuspense,
} from '../main/index.js';

describe('useExecutorSuspense', () => {
  test('suspends component rendering until the executor is settled', async () => {
    const Component = () => {
      return useExecutorSuspense(useExecutor('xxx', () => 'aaa')).get();
    };

    const result = render(
      <Suspense fallback={'ccc'}>
        <Component />
      </Suspense>
    );

    expect(result.getByText('ccc')).toBeInTheDocument();

    expect(await result.findByText('aaa')).toBeInTheDocument();
  });

  test('does not suspend rendering if the pending executor is settled', async () => {
    const manager = new ExecutorManager();
    const capture = vi.fn();

    const executor = manager.getOrCreate('xxx', 'aaa');

    const Component = () => {
      useExecutorSubscription(executor);

      useEffect(() => {
        executor.execute(async () => 'bbb');
      }, []);

      useExecutorSuspense(executor);

      capture(executor.value);

      return executor.value;
    };

    const result = render(
      <ExecutorManagerProvider value={manager}>
        <Suspense>
          <Component />
        </Suspense>
      </ExecutorManagerProvider>
    );

    expect(await result.findByText('bbb')).toBeInTheDocument();

    expect(capture).toHaveBeenCalledTimes(3);
    expect(capture).toHaveBeenNthCalledWith(1, 'aaa');
    expect(capture).toHaveBeenNthCalledWith(2, 'aaa');
    expect(capture).toHaveBeenNthCalledWith(3, 'bbb');
  });

  test('respects a predicate', async () => {
    const manager = new ExecutorManager();
    const capture = vi.fn();
    const predicateMock = vi.fn().mockReturnValue(true);

    const executor = manager.getOrCreate('xxx', 'aaa');

    const Component = () => {
      useExecutorSubscription(executor);

      useEffect(() => {
        executor.execute(async () => 'bbb');
      }, []);

      useExecutorSuspense(executor, predicateMock);

      capture(executor.value);

      return executor.value;
    };

    const result = render(
      <ExecutorManagerProvider value={manager}>
        <Suspense>
          <Component />
        </Suspense>
      </ExecutorManagerProvider>
    );

    expect(await result.findByText('bbb')).toBeInTheDocument();

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenNthCalledWith(1, 'aaa');
    expect(capture).toHaveBeenNthCalledWith(2, 'bbb');
  });
});

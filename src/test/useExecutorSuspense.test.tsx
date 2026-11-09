// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Suspense, useEffect } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import {
  ExecutorManager,
  ExecutorManagerProvider,
  useExecutor,
  useExecutorSubscription,
  useExecutorSuspense,
} from '../main/index.ts';

afterEach(() => {
  cleanup();
});

test('suspends component rendering until the executor is settled', async () => {
  const manager = new ExecutorManager();

  const Component = () => {
    return useExecutorSuspense(useExecutor('xxx', () => 'aaa')).get();
  };

  const resultPromise = act(() =>
    render(
      <ExecutorManagerProvider value={manager}>
        <Suspense fallback={'ccc'}>
          <Component />
        </Suspense>
      </ExecutorManagerProvider>
    )
  );

  expect(screen.getByText('ccc')).toBeInTheDocument();

  await resultPromise;

  expect(screen.getByText('aaa')).toBeInTheDocument();
});

test('does not suspend rendering if the pending executor is fulfilled', async () => {
  const manager = new ExecutorManager();
  const captureMock = vi.fn();

  const executor = manager.getOrCreate('xxx', 'aaa');

  const Component = () => {
    useExecutorSubscription(executor);

    useEffect(() => {
      executor.execute(async () => 'bbb');
    }, []);

    useExecutorSuspense(executor);

    captureMock(executor.value);

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

  expect(captureMock).toHaveBeenCalledTimes(3);
  expect(captureMock).toHaveBeenNthCalledWith(1, 'aaa');
  expect(captureMock).toHaveBeenNthCalledWith(2, 'aaa');
  expect(captureMock).toHaveBeenNthCalledWith(3, 'bbb');
});

test('respects a predicate', async () => {
  const manager = new ExecutorManager();
  const captureMock = vi.fn();
  const predicateMock = vi.fn().mockReturnValue(true);

  const executor = manager.getOrCreate('xxx', 'aaa');

  const Component = () => {
    useExecutorSubscription(executor);

    useEffect(() => {
      executor.execute(async () => 'bbb');
    }, []);

    useExecutorSuspense(executor, predicateMock);

    captureMock(executor.value);

    return executor.value;
  };

  const result = await act(() =>
    render(
      <ExecutorManagerProvider value={manager}>
        <Suspense>
          <Component />
        </Suspense>
      </ExecutorManagerProvider>
    )
  );

  expect(result.getByText('bbb')).toBeInTheDocument();

  expect(captureMock).toHaveBeenCalledTimes(2);
  expect(captureMock).toHaveBeenNthCalledWith(1, 'aaa');
  expect(captureMock).toHaveBeenNthCalledWith(2, 'bbb');

  expect(predicateMock).toHaveBeenCalledWith(executor);
});

test('does not call the predicate if the executor is not pending', () => {
  const executor = new ExecutorManager().getOrCreate('xxx');
  const predicateMock = vi.fn();

  renderHook(() => useExecutorSuspense(executor, predicateMock));

  expect(predicateMock).not.toHaveBeenCalled();
});

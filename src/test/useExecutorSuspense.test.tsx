import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React, { Suspense, useEffect } from 'react';
import {
  ExecutorManager,
  ExecutorManagerProvider,
  useExecutor,
  useExecutorSubscription,
  useExecutorSuspense,
} from '../main';

describe('useExecutorSuspense', () => {
  test('suspends component rendering until executors are settled', async () => {
    const Component = () => {
      const executor1 = useExecutor('xxx', () => 'aaa');
      const executor2 = useExecutor('yyy', () => 'bbb');

      useExecutorSuspense([executor1, executor2]);

      return executor1.get() + executor2.get();
    };

    const result = render(
      <Suspense fallback={'ccc'}>
        <Component />
      </Suspense>
    );

    expect(result.getByText('ccc')).toBeInTheDocument();

    expect(await result.findByText('aaabbb')).toBeInTheDocument();
  });

  test('does not suspend rendering if the pending executor is settled', async () => {
    const manager = new ExecutorManager();
    const capture = jest.fn();

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

  test('respects a custom condition', async () => {
    const manager = new ExecutorManager();
    const capture = jest.fn();
    const conditionMock = jest.fn().mockReturnValue(true);

    const executor = manager.getOrCreate('xxx', 'aaa');

    const Component = () => {
      useExecutorSubscription(executor);

      useEffect(() => {
        executor.execute(async () => 'bbb');
      }, []);

      useExecutorSuspense(executor, conditionMock);

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

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { ExecutorManager, ExecutorManagerProvider, ExecutorSuspense, useExecutorSubscription } from '../main';

describe('ExecutorSuspense', () => {
  test('does not suspend rendering if the pending executor is settled', async () => {
    const manager = new ExecutorManager();
    const capture = jest.fn();

    const executor = manager.getOrCreate('xxx', 'aaa');

    const Component = () => {
      useExecutorSubscription(executor);

      useEffect(() => {
        executor.execute(async () => 'bbb');
      }, []);

      return (
        <ExecutorSuspense executor={executor}>
          {executor => {
            capture(executor.value);
            return executor.value;
          }}
        </ExecutorSuspense>
      );
    };

    const result = render(
      <ExecutorManagerProvider value={manager}>
        <Component />
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
    const capture = jest.fn();
    const predicateMock = jest.fn().mockReturnValue(true);

    const executor = manager.getOrCreate('xxx', 'aaa');

    const Component = () => {
      useExecutorSubscription(executor);

      useEffect(() => {
        executor.execute(async () => 'bbb');
      }, []);

      return (
        <ExecutorSuspense
          executor={executor}
          predicate={predicateMock}
        >
          {executor => {
            capture(executor.value);
            return executor.value;
          }}
        </ExecutorSuspense>
      );
    };

    const result = render(
      <ExecutorManagerProvider value={manager}>
        <Component />
      </ExecutorManagerProvider>
    );

    expect(await result.findByText('bbb')).toBeInTheDocument();

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenNthCalledWith(1, 'aaa');
    expect(capture).toHaveBeenNthCalledWith(2, 'bbb');
  });
});

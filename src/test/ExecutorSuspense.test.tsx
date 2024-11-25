import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import {
  ExecutorManager,
  ExecutorManagerProvider,
  ExecutorSuspense,
  useExecutor,
  useExecutorSubscription,
} from '../main';

describe('ExecutorSuspense', () => {
  test('suspends component rendering until executors are settled', async () => {
    const Component = () => {
      const executor1 = useExecutor('xxx', () => 'aaa');
      const executor2 = useExecutor('yyy', () => 'bbb');

      return (
        <ExecutorSuspense
          fallback={'ccc'}
          executors={[executor1, executor2]}
        >
          {executors => executors[0].get() + executors[1].get()}
        </ExecutorSuspense>
      );
    };

    const result = render(<Component />);

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

      return (
        <ExecutorSuspense executors={executor}>
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
          executors={executor}
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

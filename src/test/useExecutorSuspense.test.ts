import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { createElement, Suspense } from 'react';
import { useExecutor, useExecutorSuspense } from '../main';

describe('useExecutorSuspense', () => {
  test('suspends component rendering until executors are settled', async () => {
    const Child = () => {
      const executor1 = useExecutor('xxx', () => 'aaa');
      const executor2 = useExecutor('yyy', () => 'bbb');

      useExecutorSuspense([executor1, executor2]);

      return executor1.get() + executor2.get();
    };

    const Parent = () => createElement(Suspense, { fallback: 'ccc' }, createElement(Child));

    const result = render(createElement(Parent));

    expect(result.getByText('ccc')).toBeInTheDocument();

    expect(await result.findByText('aaabbb')).toBeInTheDocument();
  });
});

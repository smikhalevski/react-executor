import React, { Suspense } from 'react';
import { useExecutor, useExecutorSuspense } from 'react-executor';
import retryInvalidated from 'react-executor/plugin/retryInvalidated';

const Hello = () => {
  const helloExecutor = useExecutor('hello', async () => {
    // Imitate network latency
    await new Promise(resolve => setTimeout(resolve, 2000));

    return 'Hello';
  });

  useExecutorSuspense(helloExecutor);

  return (
    <span>
      {helloExecutor.get()}
      <br />
      <Suspense fallback={'Loading bye'}>
        <Bye />
      </Suspense>
    </span>
  );
};

const Bye = () => {
  const byeExecutor = useExecutor(
    'bye',
    async () => {
      // Imitate network latency
      await new Promise(resolve => setTimeout(resolve, 2000));

      return 'Bye';
    },
    [retryInvalidated()]
  );

  useExecutorSuspense(byeExecutor);

  return <span>{byeExecutor.get()}</span>;
};

export const App = () => (
  <html>
    <head />
    <body>
      <Suspense fallback={'Loading'}>
        <Hello />
      </Suspense>
      <br />
      {'Chiao!'}
    </body>
  </html>
);

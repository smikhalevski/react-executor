# react-executor

Asynchronous task execution and state management for React.

# Retry a failed task

For example if you want to fetch a user, and instantly retry if the fetch fails:

```ts
import { retry } from 'parallel-universe';
import { useExecutor } from 'react-executor';

const userExecutor = useExecutor(
  'user',
  () => retry(async signal => {
    const response = fetch('/user', { signal });

    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  })
);
```

Read more about [`retry`](https://github.com/smikhalevski/parallel-universe?tab=readme-ov-file#retry) helper.

You can combine `retry` and [`timeout`](https://github.com/smikhalevski/parallel-universe?tab=readme-ov-file#retry)
helpers:

```ts
import { retry, timeout } from 'parallel-universe';
import { useExecutor } from 'react-executor';

const userExecutor = useExecutor(
  'user',
  () => timeout(
    retry(async signal => {
      // Handle user fetching here
    }),
    10_000
  )
);
```

# Retry a task on window focus

Since executors have stable identity, you can use `useEffect` to trigger refetches when an arbitrary event occurs:

```ts
import { useEffect } from 'react';
import { useExecutor } from 'react-executor';

const userExecutor = useExecutor('user', async signal => {
  // Handle user fetching here
});

useEffect(() => {
  const handleFocus = () => {
    userExecutor.retry();
  };
  
  window.addEventListener('visibilitychange', handleFocus, false);

  return () => {
    window.removeEventListener('visibilitychange', handleFocus);
  };
}, [userExecutor]);
```

# Dependent tasks

Let's assume we need to fetch a user, and after it is successfully fetched, we need to fetch the user's shopping cart:

```ts
import { useExecutor } from 'react-executor';

const userExecutor = useExecutor(
  `user-${userId}`,

  async signal => {
    // Fetch a user
  }
);

const cartExecutor = useExecutor(
  `cart-${userId}`,

  async signal => {
    // 🟡 Pause the task until the user executor is fulfilled
    const user = await userExecutor.getOrWait().withSignal(signal);

    // Fetch the user's shopping cart
  }
);
```

# Optimistic updates

To implement optimistic updates, resolve the executor with the expected value and then execute a server request.

For example, if you want to instantly show that user that they set a reaction, use this code pattern:

```ts
const reactionExecutor = useExecutor('reaction', false);

const handleClick = () => {
  reactionExecutor.resolve(true).execute(() => {
    // Handle the request and return an actual status
  });
};
```

# Invalidate executor results

To invalidate an executor that isn't directly used in the component:

```ts
const executorManager = useExecutorManager();

useEffect(() => {
  executorManager.get('user')?.invalidate();
}, []);
```

<p align="center">
  <a href="#readme"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img alt="Doubter" src="./assets/logo-light.png" width="700" />
  </picture></a>
</p>

```sh
npm install --save-prod react-executor
```

[**Introduction**](#introduction)

- [Execute a task](#execute-a-task)
- [Abort a task](#abort-a-task)
- [Replace a task](#replace-a-task)
- [Wait for a task to complete](#wait-for-a-task-to-complete)
- [Retry the latest task](#retry-the-latest-task)
- [Resolve or reject an executor](#resolve-or-reject-an-executor)
- [Clear an executor](#clear-an-executor)

[**Lifecycle**](#lifecycle)

- [Activate an executor](#activate-an-executor)
- [Invalidate results](#invalidate-results)
- [Dispose an executor](#dispose-an-executor)

[**Plugins**](#plugins)

[**React integration**](#react-integration)

- [Retry on dependencies change](#retry-on-dependencies-change)
- [Suspense](#suspense)

[**Cookbook**](#cookbook)

- [Optimistic updates](#optimistic-updates)
- [Dependent executors](#dependent-executors)

# Introduction

An executor handles the task execution process and provides ways to access results later on.

An [`Executor`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html) is created and managed by
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html) which controls its
lifecycle:

```ts
import { ExecutorManager } from 'react-executor';

const executorManager = new ExecutorManager();

const executor = executorManager.getOrCreate('rex');
// ⮕ Executor<any>
```

Each executor has a unique key in scope of the manager. Here we created the new executor with the key `'rex'`. Now each
consequent call
to [`getOrCreate`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html#getOrCreate) would return
the same executor.

If you want to retrieve an existing executor and avoid creating a new one, use
[`get`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html#getOrCreate):

```ts
executorManager.get('rex');
// ⮕ Executor<any> | undefined
```

## Execute a task

Tasks are callbacks that return a value or throw an error which are stored in the executor.

Let's execute a new task:

```ts
import { ExecutorTask } from 'react-executor';

const task: ExecutorTask = async (signal, executor) => 'Hello';

const promise = executor.execute(task);
// ⮕ AbortablePromise<any>
```

The task receives an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) and an executor
instance. Signal is aborted if a task is [aborted](#abort-a-task) or [replaced](#replace-a-task).

While tasks can be synchronous or asynchronous, executors always handle them in an asynchronous fashion. The executor is
marked as [pending](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isPending) after
[`execute`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#execute) was called:

```ts
// The executor is waiting for the task to complete.
executor.isPending
// ⮕ true
```

The returned promise is resolved when the task completes:

```ts
await promise;

// The executor doesn't have a pending task anymore.
executor.isPending;
// ⮕ false

// The result stored in the executor is a value.
executor.isFulfilled;
// ⮕ true

executor.value;
// ⮕ 'Hello'
```

The executor keeps track of
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#latestTask) it has executed:

```ts
executor.latestTask;
// ⮕ ExecutorTask
```

If a task throws an error (or returns a promise that rejects with an error), then executor becomes rejected:

```ts
await executor.execute(() => {
  throw new Error('Ooops!');
});

executor.isRejected;
// ⮕ true

// The reason of the task failure.
executor.reason;
// ⮕ Error('Ooops!')
```

An executor preserves the latest value and the latest reason when it is rejected or resolved respectively. Check if the
executor is [fulfilled](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isFulfilled),
[rejected](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isRejected), or
[settled](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isSettled) to act accordingly.

```ts
// The executor is rejected.
executor.isRejected;
// ⮕ true

// 🟡 But it still has a value.
executor.value;
// ⮕ 'Hello'
```

## Abort a task

The promise returned by the [`execute`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#execute)
method is [abortable](https://smikhalevski.github.io/parallel-universe/classes/AbortablePromise.html) so the task can
be prematurely aborted. Results of the aborted task are discarded:

```ts
promise.abort();
```

It isn't always convenient to keep the reference to the task execution promise, and you can abort the pending task by
aborting the whole executor:

```ts
executor.abort();
```

If there's no pending task, then aborting an executor is a no-op.

When a task is aborted, the signal is aborted as well. Check
the [signal status](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/aborted) to ensure that computation
should be concluded.

For example, if you're fetching data from the server inside a task, you can pass signal as
a [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch#signal) option:

```ts
const task: ExecutorTask = async (signal, executor) => {
  const response = await fetch('/hello', { signal });
  
  return response.json();
};
```

## Replace a task

If a new task is executed while the pending task isn't completed yet, then pending task is aborted and its results are
discarded:

```ts
executor.execute(async signal => 'Pluto');

const promise = executor.execute(async signal => 'Mars');

await promise;

executor.value;
// ⮕ 'Mars'
```

## Wait for a task to complete

In the [Execute a task](#execute-a-task) section we used a promise that is returned from
[`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#execute) to wait for a task
execution to complete. While this approach allows to wait for a given task execution to settle, it is usually required
to wait for an executor become settled.

Let's consider the scenario where a task is replaced with another task:

```ts
const executor = executorManager.getOrCreate('planet');

const promise = executor.toPromise();

const plutoPromise = executor.execute(async signal => 'Pluto');

const venusPromise = executor.execute(async signal => 'Venus');

await promise;
// ⮕ 'Venus'
```

In this example, `plutoPromise` is aborted, and `promise` is resolved only after executor itself is settled and not
pending anymore.

Here's another example, where executor waits to be settled:

```ts
const executor = executorManager.getOrCreate('printer');

executor.toPromise().then(value => {
  console.log(value);
});

// Prints "Hello" to console
executor.execute(() => 'Hello');
```

## Retry the latest task

To retry the [latest task](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#latestTask),
use [`retry`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#retry):

```ts
const planets = ['Mars', 'Venus'];

await executor.execute(() => planets.shift());

executor.retry();

await executor.toPromise();

executor.value;
// ⮕ 'Mars'
```

If there's no latest task, or there's a pending task, then calling `retly` is a no-op.

## Resolve or reject an executor

While tasks are always handled in an asynchronous fashion, there are cases when an executor should be settled
synchronously.

Executor can be synchronously fulfilled via
[`resolve`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#resolve):

```ts
executor.resolve('Venus');

executor.isFulfilled;
// ⮕ true

executor.value;
// ⮕ 'Venus'
```

Or rejected via [`reject`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#reject):

```ts
executor.reject(new Error('Ooops!'));

executor.isRejected;
// ⮕ true

executor.reason;
// ⮕ Error('Ooops!')
```

If there is a pending task then invoking `resolve` or `reject` will [abort it](#abort-a-task).

If you pass a promise to `resolve`, then an executor would wait for it to settle and store the result:

```ts
const planetPromise = Promise.resolve('Mars');

executor.resolve(planetPromise);

// 🟡 The executor is waiting for the promise to settle.
executor.isPending;
// ⮕ true

await executor.toPromise();

executor.value;
// ⮕ 'Hello'
```

## Clear an executor

After the executor becomes [settled](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isSettled),
it remains settled until it is cleared.

You can reset the executor back to its unsettled state
using [`clear`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#clear):

```ts
executor.clear();
```

Clearing an executor removes the stored value and reason, but _doesn't_ affect the pending task execution and preserves
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#latestTask) that was executed. 

# Lifecycle

Executors publish various events when their state changes. To subscribe to executor events use the
[`subscribe`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#subscribe) method:

```ts
const unsubscribe = executor.subscribe(event => {
  if (event.type === 'fulfilled') {
    // Handle the event here
  }
});

unsubscribe();
```

Executors may have multiple subscribers and each subscriber receives
[events](https://smikhalevski.github.io/react-executor/interfaces/ExecutorEvent.html) with following types: 

<dl>
<dt>configured</dt>
<dd>

The executor was just [created](#clear-an-executor) and plugins were applied to it. Read more about plugins in the
[Plugins](#plugins) section. 

</dd>

<dt>pending</dt>
<dd>

The executor started [a task execution](#execute-a-task). You can find the latest task the executor handled in the
[`Executor.latestTask`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#latestTask) property.

</dd>

<dt>fulfilled</dt>
<dd>

The executor was fulfilled with a value.

</dd>

<dt>rejected</dt>
<dd>

The executor was rejected with a reason.

</dd>

<dt>aborted</dt>
<dd>

The [task was aborted](#abort-a-task).

If executor is still [pending](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isPending) when
an `'aborted'` event is published then the currently pending task is being replaced with a new task.

Calling [`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#execute) when
handling an abort event may lead to stack overflow. If you need to do this anyway, execute a new task from async context
using [`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask) or a similar API.

</dd>

<dt>cleared</dt>
<dd><p>The executor was cleared and now isn't settled.</p></dd>

<dt>invalidated</dt>
<dd>

Results stored in an executor were [invalidated](#invalidate-results).

</dd>

<dt>activated</dt>
<dd>

The executor was inactive and became active. This means that there are consumers that observe the state of the executor.
Read more in the [Activate an executor](#activate-an-executor) section.

</dd>

<dt>deactivated</dt>
<dd>

The executor was active and became inactive. This means that there are no consumers that observe the state of the
executor. Read more in the [Activate an executor](#activate-an-executor) section.

</dd>

<dt>disposed</dt>
<dd>

The executor was just disposed: plugin cleanup callbacks were invoked, and the executor key isn't known to the manager
anymore. Read more in the [Dispose an executor](#dispose-an-executor) section.

</dd>
</dl>

## Activate an executor

Executors have an [active](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isActive) status that
tells whether executor is actively used by a consumer.

```ts
const deactivate = executor.activate();

executor.isActive;
// ⮕ true

deactivate();

executor.isActive;
// ⮕ false
```

If there are multiple consumers and each of them invoke the `activate` method, then executor would remain active until
all of them invoke their deactivate callbacks.

Without [plugins](#plugins), marking executor as active has no additional effect. Checking the executor active status in
a plugin allows to skip or defer excessive updates and keep executor results up-to-date lazily. For example, consider a
plugin that [retries the latest task](#retry-the-latest-task) if an active executor becomes rejected:

```ts
const retryPlugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    switch (event.type) {

      case 'rejected':
      case 'activated': 
        if (executor.isActive && executor.isRejected) {
          executor.retry();
        }
        break;
    }
  });
};

const executor = executorManager.getOrCreate('rex', heavyTask, [retryPlugin]);

executor.activate();
```

Now an executor would automatically retry the `heavyTask` if it fails. Read more about plugins in
the [Plugins](#plugins) section.

## Invalidate results

Invalidate results stored in the executor:

```ts
executor.invalidate();

executor.isStale;
// ⮕ true
```

Without [plugins](#plugins), invalidating an executor has no effect except marking executor
as [stale](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#isStale).

## Dispose an executor

By default, executors that a manager has created are preserved indefinitely and are always available though
[`get`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html#getOrCreate). This isn't always optimal, and you may want to dispose an executor when it isn't needed anymore.
Use [`dispose`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html#dispose) in such case:

```ts
const executor = executorManager.getOrCreate('test');

executorManager.dispose(executor.key);
```

All executor subscribers are unsubscribed after the disposal, and executor is removed from the manager.

If an executor is still [active](#activate-an-executor) then it won't be disposed.

# Plugins

Plugins are callbacks that are invoked only once when the executor is created by the manager. For example, you can
create a plugin that [disposes an executor](#dispose-an-executor) when it is [deactivated](#activate-an-executor):

```ts
const disposePlugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if (event.type === 'deactivted') {
      executor.dispose();
    }
  });
}
```

To apply a plugin, pass it to the
[`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html#getOrCreate):

```ts
const executor = executorManager.getOrCreate('test', undefined, [disposePlugin]);

const deactivate = executor.activate();

// 🟡 The executor is instantly disposed.
deactivate();

executorManager.get('test');
// ⮕ undefined
```

There is a bunch of built-in plugins:

```ts
executorManager.getOrCreate('rex', initialValue, [

  // Persists the executor value in the synchronous storage.
  synchronizeStorage(localStorage),

  // Instantly aborts pending task when executor is deactivated. 
  abortDeactivated(),

  // Disposes a deactivated executor after the timeout.
  disposeDeactivated(5_000),

  // Invalidates the settled executor result after the timeout.
  invalidateAfter(10_000),

  // Invalidates the settled executor result if another executor
  // with a matching key is fulfilled or invalidated.
  invalidateByPeers([/executor_key_pattern/, 'exact_executor_key']),

  // Retries the latest task of the active executor if the window
  // gains focus. 
  retryFocused(),

  // Repeats the last task after the execution was fulfilled.
  retryFulfilled(3 /* retry count */, index => 2000 * index /* delay */),
  
  // Retries the last task after the execution has failed.
  retryRejected(3 /* retry count */, index => 2000 * index /* delay */),

  // Retries the latest task of the active executor if it was invalidated. 
  retryStale(),
  
  // Binds all executor methods to the instance.
  bindAll(),
]);
```

# React integration

To use executors in React you don't need any additional configuration, just use
the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/useExecutor.html) hook right away:

```tsx
import { useExecutor } from 'react-executor';

const UserDetails = (props: { userId: string }) => {
  const executor = useExecutor(`user-${props.userId}`, signal => {
    // Fetch the user from the server.
  });
  
  if (!executor.isSettled) {
    return 'Loading…';
  }
  
  return 'User: ' + executor.get().name;
};
```

You can execute a task in response a user action, for example when user clicks a button:

```tsx
const handleClick = () => {
  executor.execute(async signal => {
    // Handle the task
  });
};
```

Every time executor state is changed, components that use the executor are re-rendered.

You can use executors both inside and outside the rendering process. To do this, provide a custom
[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/ExecutorManager.html) through the context:

```tsx
import { ExecutorManager, ExecutorManagerProvider } from 'react-executor';

const myExecutorManager = new ExecutorManager();

const App = () => (
  <ExecutorManagerProvider value={myExecutorManager}>
    <UserDetails/>
  </ExecutorManagerProvider>
)
```

Now you can use `myExecutorManager` to access all the same executors that are available through `useExecutor`.

## Retry on dependencies change

If an executor must be updated if a value changes between re-renders, you can use an effect:

```ts
const User = (props: { userId: string }) => {
  const executor = useExecutor('user');

  useEffect(() => {
    executor.execute(async signal => getUserById(props.userId, signal));
  }, [props.userId]);
}
```

If the task itself doesn't depend on a rendered value, but must be re-executed anyway when a rendered value changed, use
[`retry`](https://smikhalevski.github.io/react-executor/interfaces/Executor.html#retry):

```ts
useEffect(() => executor.retry(), [props.userId]);
```

## Suspense

Executors support fetch-as-you-render approach and can be integrated with React Suspense. To facilitate the rendering
suspension mechanism, use
[`[useExecutorSuspense`](https://smikhalevski.github.io/react-executor/functions/[useExecutorSuspense.html) hook:

```tsx
import { useExecutorSuspense } from 'react-executor';

const AccountDetails = () => {
  const executor = useExecutorSuspense(
    useExecutor('account', signal => {
      // Fetch the user from the server.
    })
  );

  return 'User: ' + executor.get().user.name;
}
```

Now when the `AccountDetails` component is rendered, it would be suspended until the executor is settled:

```tsx
import { Suspense } from 'react';

const App = () => (
  <Suspense fallback={'Loading…'}>
    <AccountDetails/>
  </Suspense>
);
```

You can provide multiple executors to `useExecutorSuspense` to wait for them in parallel:

```ts
const [accountExecutor, shoppingCartExecutor] = useExecutorSuspense([
  useExecutor('account'),
  useExecutor('shoppingCart')
]);
```

# Cookbook

## Optimistic updates

To implement optimistic updates, [resolve the executor](#resolve-or-reject-an-executor) with the expected value and then
execute a server request.

For example, if you want to instantly show that user that they set a reaction, use this code pattern:

```ts
const executor = useExecutor('reaction', false);

const handleEnableReaction = () => {
  // 1️⃣ Optimistically resolve an executor.
  executor.resolve(true);

  // 2️⃣ Synchronize state with the server.
  executor.execute(async signal => {
    const response = await fetch('/reaction', { signal });
    
    const body = await response.json();
    
    return body.isEnabled;
  });
};
```

## Dependent executors

You can pause a task until another executor is settled: 

```ts
const accountExecutor = useExecutor('account', async signal => {
  // Fetch account here.
});

const shoppingCartExecutor = useExecutor('shoppingCart', async signal => {
  const account = await accountExecutor.toPromise();
  
  // Fetch shopping cart for an account.
});
```

In this example, the component would be subscribed to both account and a shopping cart executors, and would be
re-rendered is their state is changed. To avoid unnecessary re-renders, you can acquire an executor through the
manager available in the context:

```tsx
const shoppingCartExecutor = useExecutor('shoppingCart', async (signal, executor) => {
  
  // 1️⃣ Wait for the account executor to be created.
  const accountExecutor = await executor.manager.waitFor('account');
  
  // 2️⃣ Wait for the account executor to be settled.
  const account = await accountExecutor.toPromise();

  // Fetch shopping cart for an account.
});
```

<hr/>

<p align="center">
Illustration by <a href="https://www.slackart.com/">Michael Slack</a>
</p>

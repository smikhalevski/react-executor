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

[**Try executors live**](https://codesandbox.io/p/sandbox/react-executor-example-ltflgy?file=%2Fsrc%2FApp.tsx%3A25%2C1)&ensp;🔥

[**Introduction**](#introduction)

- [Execute a task](#execute-a-task)
- [Abort a task](#abort-a-task)
- [Replace a task](#replace-a-task)
- [Wait for a task to complete](#wait-for-a-task-to-complete)
- [Retry the latest task](#retry-the-latest-task)
- [Settle an executor](#settle-an-executor)
- [Clear an executor](#clear-an-executor)

[**Lifecycle**](#lifecycle)

- [Activate an executor](#activate-an-executor)
- [Invalidate results](#invalidate-results)
- [Dispose an executor](#dispose-an-executor)

[**Plugins**](#plugins)

- [`abortDeactivated`](#abortdeactivated)
- [`bindAll`](#bindall)
- [`disposeDeactivated`](#disposedeactivated)
- [`invalidateAfter`](#invalidateafter)
- [`invalidateByPeers`](#invalidatebypeers)
- [`invalidatePeers`](#invalidatepeers)
- [`retryFocused`](#retryfocused)
- [`retryFulfilled`](#retryfulfilled)
- [`retryRejected`](#retryrejected)
- [`retryStale`](#retrystale)
- [`synchronizeStorage`](#synchronizestorage)

[**React integration**](#react-integration)

- [Suspense](#suspense)

[**Cookbook**](#cookbook)

- [Optimistic updates](#optimistic-updates)
- [Dependent tasks](#dependent-tasks)
- [Pagination](#pagination)
- [Infinite scroll](#infinite-scroll)
- [Invalidate all executors](#invalidate-all-executors)
- [Prefetching](#prefetching)
- [Server rendering](#server-rendering)

# Introduction

An executor executes tasks, stores the execution result, and provides access to it. Tasks are callbacks that return a
value or throw an error.

An [`Executor`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html) is created and
managed by
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html) which
controls the executor lifecycle:

```ts
import { ExecutorManager } from 'react-executor';

const executorManager = new ExecutorManager();

const rookyExecutor = executorManager.getOrCreate('rooky');
// ⮕ Executor<any>
```

Each executor has a unique key in the scope of the manager. Here we created the new executor with the key `'rooky'`.
Manager creates a new executor when you call
[`getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
with a new key. Each consequent call with that key returns the same executor.

If you want to retrieve an existing executor by its key and don't want to create a new executor if it doesn't exist, use
[`get`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate):

```ts
executorManager.get('bobby');
// ⮕ undefined

executorManager.get('rooky');
// ⮕ Executor<any>
```

The executor we created is unsettled, which means it neither stores a value, nor a task failure reason:

```ts
rookyExecutor.isSettled;
// ⮕ false
```

An executor can be created with an initial value:

```ts
const bobbyExecutor = executorManager.getOrCreate('bobby', 42);

bobbyExecutor.isSettled;
// ⮕ true

// The result stored in the executor is a value
bobbyExecutor.isFulfilled;
// ⮕ true

bobbyExecutor.value;
// ⮕ 42
```

An initial value can be a task which is executed, a promise which the executor awaits, or any other value that instantly
fulfills the executor. Read more in the [Execute a task](#execute-a-task) and in
the [Settle an executor](#settle-an-executor) sections.

When an executor is created, you can provide an array of plugins:

```ts
import retryRejected from 'react-executor/plugin/retryRejected';

const rookyExecutor = executorManager.getOrCreate('rooky', 42, [retryRejected()]);
```

Plugins can subscribe to [executor lifecycle](#lifecycle) events or alter the executor instance. Read more about plugins
in the [Plugins](#plugins) section.

## Execute a task

Let's execute a new task:

```ts
import { ExecutorManager, ExecutorTask } from 'react-executor';

const executorManager = new ExecutorManager();

const rookyExecutor = executorManager.getOrCreate('rooky');

const helloTask: ExecutorTask = async (signal, executor) => 'Hello';

const helloPromise = rookyExecutor.execute(task);
// ⮕ AbortablePromise<any>
```

`helloTask` receives an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) and
`rookyExecutor` as arguments. The signal is aborted if the task is [aborted](#abort-a-task) or
[replaced](#replace-a-task).

While tasks can be synchronous or asynchronous, executors always handle them in an asynchronous fashion. The executor is
marked as [pending](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isPending)
immediately after
[`execute`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#execute) was called:

```ts
// The executor is waiting for the task to complete
rookyExecutor.isPending;
// ⮕ true
```

`helloPromise` is resolved when the task completes:

```ts
await helloPromise;

// The executor doesn't have a pending task anymore
rookyExecutor.isPending;
// ⮕ false

// The result stored in the executor is a value
rookyExecutor.isFulfilled;
// ⮕ true

rookyExecutor.value;
// ⮕ 'Hello'
```

The executor keeps track of
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#latestTask) it
has executed:

```ts
rookyExecutor.latestTask;
// ⮕ helloTask
```

If a task throws an error (or returns a promise that rejects with an error), then the promise returned from the
`execute` is rejected:

```ts
const ooopsPromise = rookyExecutor.execute(() => {
  throw new Error('Ooops!');
});
// ⮕ Promise{<rejected>}

rookyExecutor.isPending;
// ⮕ true
```

The executor becomes rejected as well after `ooopsPromise` is settled:

```ts
rookyExecutor.isRejected;
// ⮕ true

// The reason of the task failure
rookyExecutor.reason;
// ⮕ Error('Ooops!')
```

Executors always preserve the latest value and the latest reason. So even when the executor
[`isPending`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isPending), you can
access the previous value or failure reason. Use
[`isFulfilled`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isFulfilled) and
[`isRejected`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isRejected) to 
detect with what result the executor has settled the last time. An executor cannot be both fulfilled and rejected at the
same time.

```ts
// Execute a new task
const byePromise = rookyExecutor.execute(() => 'Bye');

// 1️⃣ The executor is waiting for the task to complete
rookyExecutor.isPending;
// ⮕ true

// 2️⃣ The executor is still rejected after the previous task
rookyExecutor.isRejected;
// ⮕ true

rookyExecutor.reason;
// ⮕ Error('Ooops!')

// 3️⃣ The executor still holds the latest value, but it isn't fulfilled
rookyExecutor.isFulfilled;
// ⮕ false

rookyExecutor.value;
// ⮕ 'Hello'
```

The executor becomes fulfilled after `byePromise` settles:

```ts
await byePromise;

rookyExecutor.isFulfilled;
// ⮕ true

rookyExecutor.value;
// ⮕ 'Bye'
```

## Abort a task

The promise returned by
the [`execute`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#execute)
method is [abortable](https://smikhalevski.github.io/parallel-universe/classes/react_executor.AbortablePromise.html) so
the task can be prematurely aborted. Results of the aborted task are discarded:

```ts
const helloPromise = rookyExecutor.execute(async () => 'Hello');

rookyExecutor.isPending;
// ⮕ true

helloPromise.abort();

rookyExecutor.isPending;
// ⮕ false
```

It isn't always convenient to keep the reference to the task execution promise, and you can abort the pending task by
aborting the whole executor:

```ts
rookyExecutor.abort();
```

If there's no pending task, then aborting an executor is a no-op.

When a task is aborted, the signal it received as an argument is aborted as well. Check
the [signal status](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/aborted) to ensure that computation
should be concluded.

For example, if you're fetching data from the server inside a task, you can pass signal as
a [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch#signal) option:

```ts
const byeTask: ExecutorTask = async (signal, executor) => {
  const response = await fetch('/bye', { signal });
  
  return response.json();
};
```

## Replace a task

If a new task is executed while the pending task isn't completed yet, then pending task is aborted and its results are
discarded:

```ts
executor.execute(async signal => 'Pluto');

const marsPromise = executor.execute(async signal => 'Mars');

await marsPromise;

executor.value;
// ⮕ 'Mars'
```

## Wait for a task to complete

In the [Execute a task](#execute-a-task) section we used a promise that is returned from
[`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#execute) to
wait for a task execution to complete. While this approach allows to wait for a given task execution to settle, it is
usually required to wait for an executor itself become settled. The main point here is that the executor remains
pending while multiple tasks [replace one another](#replace-a-task).

Let's consider the scenario where a task is replaced with another task:

```ts
const planetExecutor = executorManager.getOrCreate('planet');

// The promise is resolved only when planetExecutor is settled
const planetPromise = planetExecutor.toPromise();

const plutoPromise = planetExecutor.execute(async signal => 'Pluto');

// plutoPromise is aborted
const venusPromise = planetExecutor.execute(async signal => 'Venus');

await planetPromise;
// ⮕ 'Venus'
```

In this example, `plutoPromise` is aborted, and `planetPromise` is resolved only after executor itself is settled and
not pending anymore.

Here's another example, where executor waits to be settled:

```ts
const printerExecutor = executorManager.getOrCreate('printer');

printerExecutor.toPromise().then(value => {
  console.log(value);
});

// Prints "Hello" to console
printerExecutor.execute(() => 'Hello');
```

## Retry the latest task

To retry
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#latestTask),
use [`retry`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#retry):

```ts
const planets = ['Mars', 'Venus'];

await executor.execute(() => planets.shift());

executor.retry();

await executor.toPromise();

executor.value;
// ⮕ 'Mars'
```

If there's no latest task, or there's a pending task already, then calling `retly` is a no-op.

If you want to forcefully retry the latest task, then abort the executor first:

```ts
executor.abort();
executor.retry();
```

## Settle an executor

While tasks are always handled in an asynchronous fashion, there are cases when an executor should be settled
synchronously.

Executor can be synchronously fulfilled via
[`resolve`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#resolve):

```ts
executor.resolve('Venus');

executor.isFulfilled;
// ⮕ true

executor.value;
// ⮕ 'Venus'
```

Or rejected
via [`reject`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#reject):

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

// The executor is waiting for the promise to settle
executor.isPending;
// ⮕ true

await executor.toPromise();

executor.value;
// ⮕ 'Mars'
```

## Clear an executor

After the executor
becomes [settled](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isSettled),
it remains settled until it is cleared.

You can reset the executor back to its unsettled state
using [`clear`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#clear):

```ts
executor.clear();
```

Clearing an executor removes the stored value and reason, but _doesn't_ affect the pending task execution and preserves
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#latestTask) that
was executed.

# Lifecycle

Executors publish various events when their state changes. To subscribe to executor events use the
[`subscribe`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#subscribe) method:

```ts
const unsubscribe = executor.subscribe(event => {
  if (event.type === 'fulfilled') {
    // Handle the event here
  }
});

unsubscribe();
```

Executors may have multiple subscribers and each subscriber receives
[events](https://smikhalevski.github.io/react-executor/interfaces/react_executor.ExecutorEvent.html) with following
types:

<dl>
<dt>configured</dt>
<dd>

The executor was just [created](#clear-an-executor) and plugins were applied to it. Read more about plugins in the
[Plugins](#plugins) section. 

</dd>

<dt>pending</dt>
<dd>

The executor started [a task execution](#execute-a-task). You can find the latest task the executor handled in the
[`Executor.latestTask`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#latestTask)
property.

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

If executor is
still [pending](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isPending) when
an `'aborted'` event is published then the currently pending task is being [replaced](#replace-a-task) with a new task.

Calling [`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#execute)
when handling an abort event may lead to stack overflow. If you need to do this anyway, execute a new task from async
context using [`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask) or a similar API.

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

Executors have
an [active](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isActive) status that
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

const executor = executorManager.getOrCreate('rooky', heavyTask, [retryPlugin]);

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
as [stale](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isStale).

## Dispose an executor

By default, executors that a manager has created are preserved indefinitely and are always available though
[`get`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate). This
isn't always optimal, and you may want to dispose an executor when it isn't needed anymore.
Use [`dispose`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#dispose) in
such case:

```ts
const executor = executorManager.getOrCreate('test');

executorManager.dispose(executor.key);
```

All executor subscribers are unsubscribed after the disposal, and executor is removed from the manager.

If an executor is still [active](#activate-an-executor) then it won't be disposed.

> [!NOTE]\
> Pending task isn't aborted if the executor is disposed. Use [`abortDeactivated`](#abortdeactivated) plugin to abort
> the task of the deactivated executor.

# Plugins

Plugins are callbacks that are invoked only once when the executor is created by the manager. For example, you can
create a plugin that aborts the pending task and [disposes an executor](#dispose-an-executor) when it is
[deactivated](#activate-an-executor):

```ts
const disposePlugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if (event.type === 'deactivted') {
      executor.abort();
      executor.dispose();
    }
  });
};
```

To apply a plugin, pass it to the
[`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
or to the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutor.html) hook:

```ts
const executor = executorManager.getOrCreate('test', undefined, [disposePlugin]);

const deactivate = executor.activate();

// The executor is instantly disposed by the plugin
deactivate();

executorManager.get('test');
// ⮕ undefined
```

## `abortDeactivated`

Aborts the pending task after the timeout if the executor is deactivated.

```ts
import abortDeactivated from 'react-executor/plugin/abortDeactivated';

const executor = useExecutor('test', heavyTask, [abortDeactivated(2_000)]);

executor.activate();

// Aborts heavyTask in 2 seconds
executor.deactivate();
```

`abortDeactivated` has a single argument: the delay after which the task should be aborted. If an executor is
re-activated during this delay, the task won't be aborted. 

## `bindAll`

Binds all executor methods to the instance.

```ts
import bindAll from 'react-executor/plugin/bindAll';

// Methods can now be detached from the executor instance
const { resolve } = useExecutor('test', 'Bye', [bindAll()]);

resolve('Hello');
```

## `disposeDeactivated`

Aborts the pending task after the timeout if the executor is deactivated.

```ts
import disposeDeactivated from 'react-executor/plugin/disposeDeactivated';

const executor = useExecutor('test', heavyTask, [disposeDeactivated(2_000)]);

executor.activate();

// Executor is disposed in 2 seconds
executor.deactivate();
```

`disposeDeactivated` has a single argument: the delay after which the executor should be disposed. If an executor is
re-activated during this delay, the executor won't be disposed.

Both an executor manager and this plugin don't abort the pending task when executor is disposed.
Use [`abortDeactivated`](#abortdeactivated) to do the job:

```ts
import abortDeactivated from 'react-executor/plugin/abortDeactivated';
import disposeDeactivated from 'react-executor/plugin/disposeDeactivated';

const executor = useExecutor('test', heavyTask, [
  abortDeactivated(2_000),
  disposeDeactivated(2_000)
]);

executor.activate();

// The heavyTask is aborted and the executor is disposed in 2 seconds
executor.deactivate();
```

## `invalidateAfter`

Invalidates the executor result after the timeout.

```ts
import invalidateAfter from 'react-executor/plugin/invalidateAfter';

const executor = useExecutor('test', 42, [invalidateAfter(2_000)]);

// The executor is invalidated in 2 seconds
executor.activate();
```

If the executor is settled then the timeout is restarted. If an executor is [deactivated](#activate-an-executor) then
it won't be invalidated.

## `invalidateByPeers`

Invalidates the executor result if another executor with a matching key is fulfilled or invalidated.

```ts
import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';

const cheeseExecutor = useExecutor('cheese', 'Burrata', [invalidateByPeers(/bread/)]);
const breadExecutor = useExecutor('bread');

// cheeseExecutor is invalidated
breadExecutor.resolve('Ciabatta');
```

## `invalidatePeers`

Invalidates peer executors with matching keys if the executor is fulfilled or invalidated.

```ts
import invalidatePeers from 'react-executor/plugin/invalidatePeers';

const cheeseExecutor = useExecutor('cheese', 'Burrata', [invalidatePeers(/bread/)]);
const breadExecutor = useExecutor('bread', 'Focaccia');

// breadExecutor is invalidated
cheeseExecutor.resolve('Mozzarella');
```

## `retryFocused`

Retries the latest task of the active executor if the window gains focus.

```ts
import retryFocused from 'react-executor/plugin/retryFocused';

const executor = useExecutor('test', 42, [retryFocused()]);
```

This plugin is no-op in the server environment.

## `retryFulfilled`

Repeats the last task after the execution was fulfilled.

```ts
import retryFulfilled from 'react-executor/plugin/retryFulfilled';

const executor = useExecutor('test', heavyTask, [retryFulfilled()]);

executor.activate();
```

If the task fails, is aborted, or if an executor is deactivated then the plugin stops the retry process.

With the default configuration, the plugin would infinitely retry the task of an active executor with a 5-second delay
between retries. This is effectively a decent polling strategy that kicks in only if someone is actually using an
executor.

Specify the number of times the task should be re-executed if it succeeds:

```ts
retryFulfilled(3)
```

Specify the delay in milliseconds between retries:

```ts
retryFulfilled(3, 5_000);
```

Provide a function that returns the delay depending on the number of retries:

```ts
retryFulfilled(5, (index, executor) => 1000 * index);
```

## `retryRejected`

Retries the last task after the execution has failed.

```ts
import retryRejected from 'react-executor/plugin/retryRejected';

const executor = useExecutor('test', heavyTask, [retryRejected()]);

executor.activate();
```

If the task succeeds, is aborted, or if an executor is deactivated then the plugin stops the retry process.

With the default configuration, the plugin would retry the task 3 times with an exponential delay between retries.

Specify the number of times the task should be re-executed if it fails:

```ts
retryRejected(3)
```

Specify the delay in milliseconds between retries:

```ts
retryRejected(3, 5_000);
```

Provide a function that returns the delay depending on the number of retries:

```ts
retryRejected(5, (index, executor) => 1000 * 1.8 ** index);
```

## `retryStale`

Retries the latest task of the active executor if it was invalidated.

```ts
import retryStale from 'react-executor/plugin/retryStale';

const executor = useExecutor('test', 42, [retryStale()]);

executor.activate();
```

Combine this plugin with [`invalidateByPeers`](#invalidatebypeers) to automatically retry this executor if another
executor on which it depends becomes invalid:

```ts
import { ExecutorTask, useExecutor } from 'react-executor';
import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';

const fetchCheese: ExecutorTask = async (signal, executor) => {
  
  // Wait for the breadExecutor to be created
  const breadExecutor = await executor.manager.waitFor('bread');

  // Wait for the breadExecutor to be settled
  const bread = await breadExecutor.toPromise();
  
  // Choose the best cheese for this bread
  return bread === 'Ciabatta' ? 'Mozzarella' : 'Burrata';
};

const cheeseExecutor = useExecutor('cheese', fetchCheese, [
  invalidateByPeers('bread'),
  retryStale(),
]);

const breadExecutor = useExecutor('bread');

// 🟡 cheeseExecutor is invalidated and re-fetches cheese
breadExecutor.resolve('Ciabatta');
```

Read more about [dependent tasks](#dependent-tasks).

## `synchronizeStorage`

Persists the executor value in the synchronous storage.

```ts
import synchronizeStorage from 'react-executor/plugin/synchronizeStorage';

const executor = useExecutor('test', 42, [synchronizeStorage(localStorage)]);

executor.activate();
```

With this plugin, you can synchronize the executor state
[across multiple browser tabs](https://codesandbox.io/p/sandbox/react-executor-example-ltflgy?file=%2Fsrc%2FApp.tsx%3A25%2C1)
in just one line.

> [!WARNING]\
> If executor is [disposed](#dispose-an-executor), then the corresponding item is removed from the storage.

By default, an executor state is serialized using
[`JSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON). If your executor
stores a value that may contain circular references, or non-serializable data like `BigInt`, use a custom serializer:

```ts
import { stringify, parse } from 'flatted';

synchronizeStorage(localStorage, { stringify, parse });
```

# React integration

To use executors in React you don't need any additional configuration, just use
the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutor.html) hook right
away:

```tsx
import { useExecutor } from 'react-executor';

const User = (props: { userId: string }) => {
  const executor = useExecutor(`user-${props.userId}`, async signal => {
    // Fetch the user from the server
  });
  
  if (executor.isPending) {
    return 'Loading…';
  }
  
  // Render the user from the executor.value
};
```

Every time the executor's state is changed, the component is re-rendered. The executor returned from the hook is
[activated](#activate-an-executor) after mount and deactivated on unmount.

The hook has the exact same signature as
the [`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
method, described in the [Introduction](#introduction) section.

You can use executors both inside and outside the rendering process. To do this, provide a custom
[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html) through
the context:

```tsx
import { ExecutorManager, ExecutorManagerProvider } from 'react-executor';

const executorManager = new ExecutorManager();

const App = () => (
  <ExecutorManagerProvider value={executorManager}>
    <User userId={'28'}/>
  </ExecutorManagerProvider>
)
```

Now you can use `executorManager` to access all the same executors that are available through the `useExecutor` hook.

If you want to have access to an executor in a component, but don't want to re-render the component when the executor's
state is changed,
use [`useExecutorManager`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutorManager.html)
hook:

```ts
const accountExecutor = useExecutorManager().getOrCreate('account');
```

You can execute a task in response a user action, for example when user clicks a button:

```tsx
const executor = useExecutor('test');

const handleClick = () => {
  executor.execute(async signal => {
    // Handle the task
  });
};
```

If you want executor to run on the client only, then execute a task from the effect:

```ts
const executor = useExecutor('test');

useEffect(() => {
  executor.execute(async signal => {
    // Handle the task
  });
}, []);
```

## Suspense

Executors support fetch-as-you-render approach and can be integrated with React Suspense. To facilitate the rendering
suspension, use the
[`useExecutorSuspense`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutorSuspense.html)
hook:

```tsx
import { useExecutorSuspense } from 'react-executor';

const Account = () => {
  const executor = useExecutorSuspense(
    useExecutor('account', signal => {
      // Fetch the account from the server
    })
  );

  // Render the account from the executor.value
};
```

An executor returned from the `useExecutorSuspense` hook is never pending.

Now when the `Account` component is rendered, it would be suspended until the executor is settled:

```tsx
import { Suspense } from 'react';

const App = () => (
  <Suspense fallback={'Loading…'}>
    <Account/>
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

To implement optimistic updates, [resolve the executor](#settle-an-executor) with the expected value and then
execute a server request.

For example, if you want to instantly show to a user that a flag was enabled:

```ts
const executor = useExecutor('flag', false);

const handleEnableClick = () => {
  // 1️⃣ Optimistically resolve an executor
  executor.resolve(true);

  // 2️⃣ Synchronize state with the server
  executor.execute(async signal => {
    const response = await fetch('/flag', { signal });
    
    const data = await response.json();
    
    return data.isEnabled;
  });
};
```

## Dependent tasks

Pause a task until another executor is settled: 

```ts
const accountExecutor = useExecutor('account', async signal => {
  // Fetch account here
});

const shoppingCartExecutor = useExecutor('shoppingCart', async signal => {
  const account = await accountExecutor.toPromise();
  
  // Fetch shopping cart for an account
});
```

In this example, the component would be subscribed to both account and a shopping cart executors, and would be
re-rendered if their state is changed. To avoid unnecessary re-renders, you can acquire an executor through the
manager:

```tsx
const shoppingCartExecutor = useExecutor('shoppingCart', async (signal, executor) => {
  
  // 1️⃣ Wait for the account executor to be created
  const accountExecutor = await executor.manager.waitFor('account');
  
  // 2️⃣ Wait for the account executor to be settled
  const account = await accountExecutor.toPromise();

  // Fetch shopping cart for an account
});
```

## Pagination

Create an executor that would store the current page contents:

```ts
const fetchPage = async (pageIndex: number, signal: AbortSignal) => {
  // Request the data from the server here
};

const pageExecutor = useExecutor('page', signal => fetchPage(0, signal));

const handleGoToPageClick = (pageIndex: number) => {
  pageExecutor.execute(signal => fetchPage(pageIndex, signal));
};
```

The executor preserves the latest value it was resolved with, so you can render page contents using `executor.value`,
and render a spinner when `executor.isPending`. 

## Infinite scroll

Create a task that uses the current executor value to combine it with the data loaded from the server:

```ts
const itemsExecutor = useExecutor<Item[]>('items', async (signal, executor) => {
  const items = executor.value || [];

  return items.concat(await fetchItems({ offset: items.length, signal }));
});
```

Now if a user clicks on a button to load more items, `itemsExecutor` must retry the latest task:

```ts
const handleLoadMoreClick = () => {
  itemsExecutor.retry();
};
```

## Invalidate all executors

[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#_iterator_)
is iterable and provides access to all executors that it has created. You can perform bach operations with all executors
in for-loop:

```ts
const executorManager = useExecutorManager();

for (const executor of executorManager) {
  executor.invalidate();
}
```

By default, invalidating an executor has no additional effect. If you want to
[retry the latest task](#retry-the-latest-task) that each executor has executed, use
[`retry`](https://smikhalevski.github.io/react-executor/interface/react_executor.Executor.html#retry):

```ts
for (const executor of executorManager) {
  executor.retry();
}
```

It isn't optimal to retry all executors even if they aren't [actively used](#activate-an-executor). Use the
[`retryStale`](https://smikhalevski.github.io/react-executor/interface/react_executor.Executor.html#retry) to retry active executors when they are invalidated.

## Prefetching

In some cases, you can initialize an executor before its data is required for the first time:

```ts
const User = () => {
  useExecutorManager().getOrCreate('shoppingCart', fetchShoppingCart);
};
```

In this example, the executor with the `'shoppingCart'` key is initialized once the component is rendered for the first
time. The `User` component _won't be re-rendered_ if the state of this executor is changed.

To do prefetching before the application is even rendered, create an executor manager beforehand:

```tsx
const executorManager = new ExecutorManager();

// Prefetch the shopping cart
executorManager.getOrCreate('shoppingCart', fetchShoppingCart);

const App = () => (
  <ExecutorManagerProvider value={executorManager}>
    {/* Render you app here */}
  </ExecutorManagerProvider>
);
```

## Server rendering

Both [`Executor`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html) and [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html) are JSON-serializable. After server rendering is competed, serialize
the executor manager and send its state to the client:

```ts
response.write(`<script>window.__EXECUTORS__ = ${JSON.stringify(executorManager)}</script>`);
```

On the client, deserialize the initial state and pass it to the `ExecutorManager` constructor:

```ts
const executorManager = new ExecutorManager(JSON.parse(window.__EXECUTORS__));
```

Now when you create a new executor using
[`getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
it would be initialized with the state delivered from the server.

If during SSR you need to wait for all executors to settle:

```ts
await Promise.allSettled(
  Array.from(executorManager).map(executor => executor.toPromise())
);
```

<hr/>

<p align="center">
Illustration by <a href="https://www.slackart.com/">Michael Slack</a>
</p>

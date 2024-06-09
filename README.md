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

🔥&ensp;**Live examples**
- [TODO app](https://codesandbox.io/p/sandbox/react-executor-example-ltflgy)
- [Streaming SSR](https://codesandbox.io/p/devbox/react-executor-ssr-streaming-example-mwrmrs)
- [Next.js integration](https://codesandbox.io/p/devbox/react-executor-next-example-whsj4v)

🔰&ensp;[**Introduction**](#introduction)

- [Executor keys](#executor-keys)
- [Execute a task](#execute-a-task)
- [Abort a task](#abort-a-task)
- [Replace a task](#replace-a-task)
- [Wait for a task to complete](#wait-for-a-task-to-complete)
- [Retry the latest task](#retry-the-latest-task)
- [Settle an executor](#settle-an-executor)
- [Clear an executor](#clear-an-executor)

📢&ensp;[**Events and lifecycle**](#events-and-lifecycle)

- [Activate an executor](#activate-an-executor)
- [Invalidate results](#invalidate-results)
- [Detach an executor](#detach-an-executor)

🔌&ensp;[**Plugins**](#plugins)

- [`abortDeactivated`](#abortdeactivated)
- [`abortPending`](#abortpending)
- [`abortWhen`](#abortwhen)
- [`bindAll`](#bindall)
- [`detachDeactivated`](#detachdeactivated)
- [`invalidateAfter`](#invalidateafter)
- [`invalidateByPeers`](#invalidatebypeers)
- [`invalidatePeers`](#invalidatepeers)
- [`rejectPending`](#rejectpending)
- [`resolveWhen`](#resolvewhen)
- [`retryFulfilled`](#retryfulfilled)
- [`retryInvalidated`](#retryinvalidated)
- [`retryRejected`](#retryrejected)
- [`retryWhen`](#retrywhen)
- [`synchronizeStorage`](#synchronizestorage)

⚛️&ensp;[**React integration**](#react-integration)

- [Suspense](#suspense)

🚀&ensp;[**Server-side rendering**](#server-side-rendering)

- [Render to string](#render-to-string)
- [Streaming SSR](#streaming-ssr)
- [State serialization](#state-serialization)
- [Content-Security-Policy support](#content-security-policy-support)
- [Next.js integration](#nextjs-integration)

⚙️&ensp;[**Devtools**](#devtools)

🍪&ensp;**Cookbook**

- [Optimistic updates](#optimistic-updates)
- [Dependent tasks](#dependent-tasks)
- [Pagination](#pagination)
- [Infinite scroll](#infinite-scroll)
- [Invalidate all executors](#invalidate-all-executors)
- [Prefetching](#prefetching)

# Introduction

An executor executes a task, stores the execution result, and provides access to it. Tasks are callbacks that return a
value or throw an error.

An [`Executor`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html) is created and
managed by
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html) which
controls the executor lifecycle:

```ts
import { ExecutorManager } from 'react-executor';

const manager = new ExecutorManager();

const rookyExecutor = manager.getOrCreate('rooky');
// ⮕ Executor<any>
```

Each executor has a unique key in the scope of the manager. Here we created the new executor with the key `'rooky'`.
Managers create a new executor when you call
[`getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
with a new key. Each consequent call with that key returns the same executor.

If you want to retrieve an existing executor by its key and don't want to create a new executor if it doesn't exist, use
[`get`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#get):

```ts
manager.get('bobby');
// ⮕ undefined

manager.get('rooky');
// ⮕ Executor<any>
```

The executor we created is unsettled, which means it neither stores a value, nor a task failure reason:

```ts
rookyExecutor.isSettled;
// ⮕ false
```

An executor can be created with an initial value:

```ts
const bobbyExecutor = manager.getOrCreate('bobby', 42);

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

const rookyExecutor = manager.getOrCreate('rooky', 42, [retryRejected()]);
```

Plugins can subscribe to [executor events](#events-and-lifecycle) or alter the executor instance. Read more about
plugins in the [Plugins](#plugins) section.

## Executor keys

Anything can be an executor key: a string, a number, an object, etc. By default, keys are considered identical if
their [`JSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)-serialized form is
identical:

```ts
const manager = new ExecutorManager();

const userExecutor = manager.getOrCreate(['user', 123]);

manager.get(['user', 123]);
// ⮕ userExecutor
```

To override, how keys are serialized
pass [`keySerializer`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.ExecutorManagerOptions.html#keySerializer)
option to the `ExecutorManager` constructor. Key serializer is a function that receives the requested executor key and
returns its serialized form. The returned serialized key form can be anything, a string, or an object.

If you're using objects as executor keys, then you may want to enable stable serialization (when keys are always sorted
during serialized). In this case use any library that supports stable JSON serialization:

```ts
import { stringify } from 'json-marshal';

const manager = new ExecutorManager({
  keySerializer: key => stringify(key, { stable: true })
});

const bobrExecutor = manager.getOrCreate({ id: 123, name: 'Woody' });
// ⮕ Executor<any>

// 🟡 Key properties are listed in a different order
manager.get({ name: 'Woody', id: 123 });
// ⮕ bobrExecutor
```

> [!TIP]\
> With additional configuration, [json-marshal](https://github.com/smikhalevski/json-marshal#readme) can stringify and
> parse any data structure.

If you want to use object references as executor keys, provide an identity function as a serializer:

```ts
const manager = new ExecutorManager({
  keySerializer: key => key
});

const bobrKey = { id: 123 };

const bobrExecutor = manager.getOrCreate(bobrKey);

// The same executor is returned for the same key
manager.get(bobrKey);
// ⮕ bobrExecutor

const anotherBobrExecutor = manager.getOrCreate({ id: 123 });

// 🟡 Executors are different because different objects were used as keys
bobrExecutor === anotherBobrExecutor;
// ⮕ false
```

## Execute a task

Let's execute a new task:

```ts
import { ExecutorManager, ExecutorTask } from 'react-executor';

const manager = new ExecutorManager();

const rookyExecutor = manager.getOrCreate('rooky');

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
[`execute`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#execute) is called:

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
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#task) it
has executed:

```ts
rookyExecutor.task;
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
method is [abortable](https://smikhalevski.github.io/parallel-universe/classes/AbortablePromise.html) so
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

await executor.execute(async signal => 'Mars');

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
const planetExecutor = manager.getOrCreate('planet');

// The promise is resolved only when planetExecutor is settled
const planetPromise = planetExecutor.getOrAwait();

const marsPromise = planetExecutor.execute(async signal => 'Mars');

// 🟡 marsPromise is aborted, because task was replaced
const venusPromise = planetExecutor.execute(async signal => 'Venus');

await planetPromise;
// ⮕ 'Venus'
```

In this example, `marsPromise` is aborted, and `planetPromise` is resolved only after executor itself is settled and
not pending anymore.

Here's another example, where the executor waits to be settled:

```ts
const printerExecutor = manager.getOrCreate('printer');

printerExecutor.getOrAwait().then(value => {
  console.log(value);
});

// Prints "Hello" to console
printerExecutor.execute(() => 'Hello');
```

## Retry the latest task

To retry
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#task),
use [`retry`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#retry):

```ts
const planets = ['Mars', 'Venus'];

await executor.execute(() => planets.shift());

executor.retry();

await executor.getOrAwait();

executor.value;
// ⮕ 'Mars'
```

If there's no latest task, or there's a pending task already, then calling `retry` is a no-op.

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

await executor.getOrAwait();

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
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#task) that
was executed.

# Events and lifecycle

Executors publish various events when their state changes. To subscribe to executor events use the
[`subscribe`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#subscribe) method:

```ts
const manager = new ExecutorManager();

const rookyExecutor = manager.getOrCreate('rooky');

const unsubscribe = rookyExecutor.subscribe(event => {
  if (event.type === 'fulfilled') {
    // Handle the event here
  }
});

unsubscribe();
```

You can subscribe to the executor manager to receive events from all executors. For example, you can automatically retry
any invalidated executor:

```ts
manager.subscribe(event => {
  if (event.type === 'invalidated') {
    event.target.retry();
  }
});
```

Both executors and managers may have multiple subscribers and each subscriber receives
[events](https://smikhalevski.github.io/react-executor/interfaces/react_executor.ExecutorEvent.html) with following
types:

<dl>
<dt>attached</dt>
<dd>

The executor was just created, plugins were applied to it, and it was attached to the manager. Read more about plugins
in the [Plugins](#plugins) section.

</dd>

<dt>detached</dt>
<dd>

The executor was just detached: it was removed from the manager and all of its subscribers were unsubscribed. Read more
in the [Detach an executor](#detach-an-executor) section.

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

<dt>pending</dt>
<dd>

The executor started [a task execution](#execute-a-task). You can find the latest task the executor handled in the
[`Executor.task`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#task)
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

<dt>annotated</dt>
<dd>

[Annotations](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#annotations)
associated with the executor were patched.

</dd>

<dt>plugin_configured</dt>
<dd>

The configuration of the plugin associated with the executor was updated.

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

By default, marking an executor as active has no additional effect. Checking the executor active status in a plugin
allows to skip or defer excessive updates and keep executor results up-to-date lazily. For example, consider a plugin
that [retries the latest task](#retry-the-latest-task) if an active executor becomes rejected:

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

const executor = manager.getOrCreate('rooky', heavyTask, [retryPlugin]);

executor.activate();
```

Now an executor would automatically retry the `heavyTask` if it fails. Read more about plugins in
the [Plugins](#plugins) section.

## Invalidate results

Invalidate results stored in the executor:

```ts
executor.invalidate();

executor.isInvalidated;
// ⮕ true
```

After the executor is fulfilled, rejected, or cleared, it becomes valid:

```ts
executor.resolve('Okay');

executor.isInvalidated;
// ⮕ false
```

By default, invalidating an executor has no effect except marking it
as [invalidated](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#isInvalidated).

## Detach an executor

By default, executors that a manager has created are preserved indefinitely and are always available though
[`get`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#get). This isn't
always optimal, and you may want to detach an executor when it isn't needed anymore.
Use [`detach`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#detach) in
such case:

```ts
const executor = manager.getOrCreate('test');

manager.detach(executor.key);
// ⮕ true
```

All executor subscribers are now unsubscribed, and executor is removed from the manager.

If an executor is still [active](#activate-an-executor) then it won't be detached.

> [!NOTE]\
> Pending task isn't aborted if the executor is detached. Use [`abortDeactivated`](#abortdeactivated) plugin to abort
> the task of the deactivated executor.

# Plugins

Plugins are callbacks that are invoked only once when the executor is created by the manager. For example, you can
create a plugin that aborts the pending task and [detaches an executor](#detach-an-executor) when it is
[deactivated](#activate-an-executor):

```ts
const detachPlugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if (event.type === 'deactivted') {
      executor.abort();
      executor.manager.detach(executor.key);
    }
  });
};
```

To apply a plugin, pass it to the
[`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
or to the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutor.html) hook:

```ts
const executor = manager.getOrCreate('test', undefined, [detachPlugin]);

const deactivate = executor.activate();

// The executor is instantly detached by the plugin
deactivate();

manager.get('test');
// ⮕ undefined
```

You can define plugins that are applied to all executors that are created by a manager:

```ts
const manager = new ExecutorManager({
  plugins: [bindAll()]
});

const { execute } = manager.getOrCreate('test');

// Methods can be detached because bindAll plugin was applied
execute(heavyTask)
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

## `abortPending`

[Aborts the pending task](#abort-a-task)
with [`TimeoutError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror) if the task execution
took longer then the given timeout.

```ts
import abortPending from 'react-executor/plugin/abortPending';

const executor = useExecutor('test', heavyTask, [
  abortPending(10_000)
]);
```

## `abortWhen`

[Aborts the pending task](#abort-a-task) depending on boolean values pushed by an
[`Observable`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Observable.html).

For example, if the window was offline for more than 5 seconds then the pending task is aborted:

```ts
import abortWhen from 'react-executor/plugin/abortWhen';
import windowOnline from 'react-executor/observable/windowOnline';

const executor = useExecutor('test', heavyTask, [
  abortWhen(windowOnline, 5_000)
]);
```

If a new task is passed to the
[`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#execute)
method after the timeout has run out then the task is instantly aborted.

Read more about observables in the [`retryWhen`](#retrywhen) section.

## `bindAll`

Binds all executor methods to the instance.

```ts
import bindAll from 'react-executor/plugin/bindAll';

// Methods can now be detached from the executor instance
const { resolve } = useExecutor('test', 'Bye', [bindAll()]);

resolve('Hello');
```

You can enable this plugin for all executors created by the execution manager:

```ts
import { ExecutorManager } from 'react-executor';
import bindAll from 'react-executor/plugin/bindAll';

const manager = new ExecutorManager({
  plugins: [bindAll()]
});
```

Provide the manager so the `useExecutor` hook would employ it to create new executors:

```tsx
<ExecutorManagerProvider value={manager}>
  <App/>
</ExecutorManagerProvider>
```

## `detachDeactivated`

Aborts the pending task after the timeout if the executor is deactivated.

```ts
import detachDeactivated from 'react-executor/plugin/detachDeactivated';

const executor = useExecutor('test', heavyTask, [detachDeactivated(2_000)]);

executor.activate();

// Executor is detached in 2 seconds
executor.deactivate();
```

`detachDeactivated` has a single argument: the delay after which the executor should be detached. If an executor is
re-activated during this delay, the executor won't be detached.

Both an executor manager and this plugin don't abort the pending task when executor is detached.
Use [`abortDeactivated`](#abortdeactivated) to do the job:

```ts
import abortDeactivated from 'react-executor/plugin/abortDeactivated';
import detachDeactivated from 'react-executor/plugin/detachDeactivated';

const executor = useExecutor('test', heavyTask, [
  abortDeactivated(2_000),
  detachDeactivated(2_000)
]);

executor.activate();

// The heavyTask is aborted and the executor is detached in 2 seconds
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

const cheeseExecutor = useExecutor('cheese', 'Burrata', [
  invalidateByPeers(executor => executor.key === 'bread')
]);

const breadExecutor = useExecutor('bread');

// cheeseExecutor is invalidated
breadExecutor.resolve('Ciabatta');
```

## `invalidatePeers`

Invalidates peer executors with matching keys if the executor is fulfilled or invalidated.

```ts
import invalidatePeers from 'react-executor/plugin/invalidatePeers';

const cheeseExecutor = useExecutor('cheese', 'Burrata', [
  invalidatePeers(executor => executor.key === 'bread')
]);

const breadExecutor = useExecutor('bread', 'Focaccia');

// breadExecutor is invalidated
cheeseExecutor.resolve('Mozzarella');
```

## `rejectPending`

[Aborts the pending task](#abort-a-task) and [rejects the executor](#settle-an-executor)
with [`TimeoutError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror) if the task execution
took longer then the given timeout.

```ts
import rejectPending from 'react-executor/plugin/rejectPending';

const executor = useExecutor('test', heavyTask, [
  rejectPending(10_000)
]);
```

## `resolveWhen`

[Resolves the executor](#settle-an-executor) with values pushed by an
[`Observable`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Observable.html).

```ts
import { Observable } from 'react-executor';
import resolveWhen from 'react-executor/plugin/resolveWhen';

const observable: Observable<string> = {
  subscribe(listener) {
    // Call the listener when value is changed
    const timer = setTimeout(listener, 1_000, 'Venus');

    return () => {
      // Unsubscribe the listener
      clearTimeout(timer);
    };
  }
};

const executor = useExecutor('planet', 'Mars', [
  resolveWhen(observable)
]);
```

[`PubSub`](https://smikhalevski.github.io/parallel-universe/classes/PubSub.html) can be used do decouple the lazy data source from the executor:

```ts
import { PubSub } from 'parallel-universe';

const pubSub = new PubSub<string>();

const executor = useExecutor('planet', 'Mars', [
  resolveWhen(pubSub)
]);

pubSub.publish('Venus');

executor.value;
// ⮕ 'Venus'
```


## `retryFulfilled`

[Retries the latest task](#retry-the-latest-task) after the execution was fulfilled.

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

## `retryInvalidated`

Retries the latest task of the active executor if it was invalidated.

```ts
import retryInvalidated from 'react-executor/plugin/retryInvalidated';

const executor = useExecutor('test', 42, [retryInvalidated()]);

executor.activate();
```

Combine this plugin with [`invalidateByPeers`](#invalidatebypeers) to automatically retry this executor if another
executor on which it depends becomes invalid:

```ts
import { ExecutorTask, useExecutor } from 'react-executor';
import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';

const fetchCheese: ExecutorTask = async (signal, executor) => {
  
  // Wait for the breadExecutor to be created
  const breadExecutor = await executor.manager.getOrAwait('bread');

  // Wait for the breadExecutor to be settled
  const bread = await breadExecutor.getOrAwait();
  
  // Choose the best cheese for this bread
  return bread === 'Ciabatta' ? 'Mozzarella' : 'Burrata';
};

const cheeseExecutor = useExecutor('cheese', fetchCheese, [
  invalidateByPeers(executor => executor.key === 'bread'),
  retryInvalidated(),
]);

const breadExecutor = useExecutor('bread');

// 🟡 cheeseExecutor is invalidated and re-fetches cheese
breadExecutor.resolve('Ciabatta');
```

Read more about [dependent tasks](#dependent-tasks).

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

## `retryWhen`

[Retries the latest task](#retry-the-latest-task) depending on boolean values pushed by an
[`Observable`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Observable.html).

For example, if the window was offline for more than 5 seconds, the executor would retry the `heavyTask` after
the window is back online:

```ts
import retryWhen from 'react-executor/plugin/retryWhen';
import windowOnline from 'react-executor/observable/windowOnline';

const executor = useExecutor('test', heavyTask, [
  retryWhen(windowOnline, 5_000)
]);
```

Combining multiple plugins, you can set up a complex executor behaviour. For example, let's create an executor that
follows these requirements:

1. Executes the task every 5 seconds.
2. Aborts the pending task if the window loses focus for more than 10 seconds.
3. Aborts instantly if the window goes offline.
4. Resumes the periodic task execution if window gains focus or goes back online.

```ts
import { useExecutor } from 'react-executor';
import abortWhen from 'react-executor/plugin/abortWhen';
import retryWhen from 'react-executor/plugin/retryWhen';
import retryFulfilled from 'react-executor/plugin/retryFulfilled';
import windowFocused from 'react-executor/observable/windowFocused';
import windowOnline from 'react-executor/observable/windowOnline';

useExecutor('test', heavyTask, [

  // Execute the task every 5 seconds
  retryFulfilled(Infinity, 5_000),
  
  // Abort the task and prevent future executions
  // if the window looses focus for at least 10 seconds
  abortWhen(windowFocused, 10_000),

  // Retry the latest task if the window gains focus
  // after being out of focus for at least 10 seconds
  retryWhen(windowFocused, 10_000),
  
  // Instantly abort the pending task if the window goes offline
  abortWhen(windowOnline),

  // Retry the latest task if the window goes online
  retryWhen(windowOnline)
]);
```

## `synchronizeStorage`

Persists the executor value in the synchronous storage.

```ts
import synchronizeStorage from 'react-executor/plugin/synchronizeStorage';

const executor = useExecutor('test', 42, [synchronizeStorage(localStorage)]);

executor.activate();
```

With this plugin, you can synchronize the executor state
[across multiple browser tabs](https://codesandbox.io/p/sandbox/react-executor-example-ltflgy)
in just one line.

> [!IMPORTANT]\
> If executor is [detached](#detach-an-executor), then the corresponding item is removed from the storage.

By default, an executor state is serialized using
[`JSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON). If your executor
stores a value that may contain circular references, or non-serializable data like `BigInt`, use a custom serializer.

Here's how you can enable serialization of objects with circular references:

```ts
import { stringify, parse } from 'json-marshal';

const executor = useExecutor('test', 42, [
  synchronizeStorage(localStorage, {
    serializer: { stringify, parse },
  })
]);
```

> [!TIP]\
> With additional configuration, [json-marshal](https://github.com/smikhalevski/json-marshal#readme) can stringify and
> parse any data structure.

By default, `synchronizeStorage` plugin uses a [serialized executor key](#executor-keys) as a storage key. You can
provide a custom key
via [`storageKey`](https://smikhalevski.github.io/react-executor/interfaces/plugin_synchronizeStorage.SynchronizeStorageOptions.html#storageKey)
option:

```ts
useExecutor('test', 42, [
  synchronizeStorage(localStorage, { storageKey: 'helloBobr' })
]);
```

In the environment where storage is unavailable (for example, [during SSR](#server-side-rendering)), you can
conditionally disable the plugin:

```ts
useExecutor('test', 42, [
  typeof localStorage !== 'undefined' ? synchronizeStorage(localStorage) : null
]);
```

# React integration

In the basic scenario, to use executors in your React app, you don't need any additional configuration, just use
the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutor.html) hook right
away:

```tsx
import { useExecutor } from 'react-executor';

const User = (props: { userId: string }) => {

  const executor = useExecutor(['user', props.userId], async signal => {
    // Fetch the user from the server
  });
  
  if (executor.isPending) {
    return 'Loading';
  }
  
  // Render the user from the executor.value
};
```

Every time the executor's state is changed, the component is re-rendered. The executor returned from the hook is
[activated](#activate-an-executor) after mount and deactivated on unmount.

The hook has the exact same signature as
the [`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html#getOrCreate)
method, described in the [Introduction](#introduction) section.

> [!TIP]\
> Check out the live example
> of [the TODO app](https://codesandbox.io/p/sandbox/react-executor-example-ltflgy) that employs React Executor.

You can use executors both inside and outside the rendering process. To do this, provide a custom
[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html) through
the context:

```tsx
import { ExecutorManager, ExecutorManagerProvider } from 'react-executor';

const manager = new ExecutorManager();

const App = () => (
  <ExecutorManagerProvider value={manager}>
    <User userId={'28'}/>
  </ExecutorManagerProvider>
)
```

Now you can use `manager` to access all the same executors that are available through the `useExecutor` hook:

```ts
const executor = manager.get(['user', '28']);
```

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
import { useExecutor, useExecutorSuspense } from 'react-executor';

const Account = () => {
  const accountExecutor = useExecutor('account', signal => {
    // Fetch the account from the server
  });
  
  // Suspend rendering
  useExecutorSuspense(accountExecutor);

  // accountExecutor is settled during render
  accountExecutor.get();
};
```

Now when the `Account` component is rendered, it would be suspended until the `accountExecutor` is settled:

```tsx
import { Suspense } from 'react';

const App = () => (
  <Suspense fallback={'Loading'}>
    <Account/>
  </Suspense>
);
```

You can provide multiple executors to `useExecutorSuspense` to wait for them in parallel:

```ts
const accountExecutor = useExecutor('account');
const shoppingCartExecutor = useExecutor('shoppingCart');

useExecutorSuspense([accountExecutor, shoppingCartExecutor]);
```

# Server-side rendering

> [!TIP]\
> Check out the live example
> of [streaming SSR](https://codesandbox.io/p/devbox/react-executor-ssr-streaming-example-mwrmrs) with React Executor.

Executors can be hydrated on the client after being rendered on the server.

To enable hydration on the client, create the executor manager and provide it through a context:

```tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { enableSSRHydration, ExecutorManager, ExecutorManagerProvider } from 'react-executor';

const manager = new ExecutorManager();

// 🟡 Hydrates executors on the client with the server data
enableSSRHydration(manager);

hydrateRoot(
  document,
  <ExecutorManagerProvider value={manager}>
    <App/>
  </ExecutorManagerProvider>
);
```

Here, `App` is the component that renders your application. Inside the `App` you can use `useExecutor` and
[`useExecutorSuspence`](#suspense) to load your data.

[`enableSSRHydration`](https://smikhalevski.github.io/react-executor/functions/react_executor.enableSSRHydration.html)
must be called only once, and only one manager on the client-side can receive the dehydrated state from the server.

On the server, you can either render your app contents [as a string](#render-to-string) and send it to the client in one
go, or [stream the contents](#streaming-ssr).

## Render to string

To render your app as an HTML string
use [`SSRExecutorManager`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html):

```tsx
import { createServer } from 'http';
import { renderToString } from 'react-dom/server';
import { ExecutorManagerProvider } from 'react-executor';
import { SSRExecutorManager } from 'react-executor/ssr';

const server = createServer(async (request, response) => {

  // 1️⃣ Create a new manager for each request
  const manager = new SSRExecutorManager();

  let html;
  do {
    html = renderToString(
      <ExecutorManagerProvider value={manager}>
        <App/>
      </ExecutorManagerProvider>
    );

    // 2️⃣ Render until there are no more changes
  } while (await manager.hasChanges());

  // 3️⃣ Attach dehydrated executor states
  html += manager.nextHydrationChunk();

  // 4️⃣ Send the rendered HTML to the client
  response.end(html);
});

server.listen(8080);
```

In this example, the `App` is expected to render the `<script>` tag that loads the client bundle. Otherwise, you can
inject client chunk manually:

```ts
html += '<script src="/client.js" async></script>';
```

A new executor manager must be created for each request, so the results that are stored in executors are served in
response to a particular request.

[`hasChanges`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html#hasChanges) would
resolve with `true` if state of some executors have changed during rendering.

The hydration chunk returned
by [`nextHydrationChunk`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html#nextHydrationChunk)
contains the `<script>` tag that hydrates the manager for which
[`enableSSRHydration`](https://smikhalevski.github.io/react-executor/functions/react_executor.enableSSRHydration.html)
was invoked.

## Streaming SSR

Thanks to [Suspense](#suspense), React can stream parts of your app while it is being rendered. React Executor provides
API to inject its hydration chunks into a streaming process. The API is different for NodeJS streams and
[Readable Web Streams](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

In NodeJS environment
use [`PipeableSSRExecutorManager`](https://smikhalevski.github.io/react-executor/classes/ssr_node.PipeableSSRExecutorManager.html)

```tsx
import { createServer } from 'http';
import { renderToPipeableStream } from 'react-dom/server';
import { ExecutorManagerProvider } from 'react-executor';
import { PipeableSSRExecutorManager } from 'react-executor/ssr/node';

const server = createServer(async (request, response) => {

  // 1️⃣ Create a new manager for each request
  const manager = new PipeableSSRExecutorManager(response);

  const stream = renderToPipeableStream(
    <ExecutorManagerProvider value={manager}>
      <App/>
    </ExecutorManagerProvider>,
    {
      bootstrapScripts: ['/client.js'],

      onShellReady() {
        // 2️⃣ Pipe the rendering output to the manager's stream 
        stream.pipe(manager.stream);
      },
    }
  );
});

server.listen(8080);
```

State of executors is streamed to the client along with the chunks rendered by React.

In the `App` component, use the combination of [`<Suspense>`](https://react.dev/reference/react/Suspense),
[`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutor.html) and
[`useExecutorSuspence`](https://smikhalevski.github.io/react-executor/functions/react_executor.useExecutorSuspense.html)
to suspend rendering while executors process their tasks:

```tsx
export const App = () => (
  <html>
    <head/>
    <body>
      <Suspense fallback={'Loading'}>
        <Hello/>
      </Suspense>
    </body>
  </html>
);

export const Hello = () => {
  const helloExecutor = useExecutor('hello', async () => {
    // Asynchronously return the result
    return 'Hello, Paul!';
  });

  // 🟡 Suspend rendering until helloExecutor is settled
  useExecutorSuspense(helloExecutor);

  return helloExecutor.get();
};
```

If the `App` is rendered in streaming mode, it would first show "Loading" and after the executor is settled, it would
update to "Hello, Paul!". In the meantime `helloExecutor` on the client would be hydrated with the data from the server.

### Readable web streams support

To enable streaming in a modern environment,
use [`ReadableSSRExecutorManager`](https://smikhalevski.github.io/react-executor/classes/ssr.ReadableSSRExecutorManager.html)

```tsx
import { renderToReadableStream } from 'react-dom/server';
import { ExecutorManagerProvider } from 'react-executor';
import { ReadableSSRExecutorManager } from 'react-executor/ssr';

async function handler(request) {

  // 1️⃣ Create a new manager for each request
  const manager = new ReadableSSRExecutorManager();

  const stream = await renderToReadableStream(
    <ExecutorManagerProvider value={manager}>
      <App />
    </ExecutorManagerProvider>,
    {
      bootstrapScripts: ['/client.js'],
    }
  );

  // 2️⃣ Pipe the response through the manager
  return new Response(stream.pipeThrough(manager), {
    headers: { 'content-type': 'text/html' },
  });
}
```

State of executors is streamed to the client along with the chunks rendered by React.

## State serialization

By default, an executor state is serialized using
[`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) that
has quite a few limitations. If your executor stores a value that may contain circular references, or non-serializable
data like `BigInt`, use a custom state serialization.

On the client, pass
a [`stateParser`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.SSRHydrationOptions.html#stateParser)
option to `enableSSRHydration`:

```tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { enableSSRHydration, ExecutorManager, ExecutorManagerProvider } from 'react-executor';
import { parse } from 'json-marshal';

const manager = new ExecutorManager();

// 🟡 Pass a custom state parser
enableSSRHydration(manager, { stateParser: parse });

hydrateRoot(
  document,
  <ExecutorManagerProvider value={manager}>
    <App/>
  </ExecutorManagerProvider>
);
```

On the server, pass
a [`stateStringifier`](https://smikhalevski.github.io/react-executor/interfaces/ssr.SSRExecutorManagerOptions.html#stateStringifier)
option to [`SSRExecutorManager`](#render-to-string),
[`PipeableSSRExecutorManager`](#streaming-ssr),
or [`ReadableSSRExecutorManager`](#readable-web-streams-support), depending on your setup:

```ts
import { SSRExecutorManager } from 'react-executor/ssr';
import { stringify } from 'json-marshal';

const manager = new SSRExecutorManager({ stateStringifier: stringify });
```

> [!TIP]\
> With additional configuration, [json-marshal](https://github.com/smikhalevski/json-marshal#readme) can stringify and
> parse any data structure.

## Content-Security-Policy support

By default,
[`nextHydrationChunk`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html#nextHydrationChunk)
renders an inline `<script>` tag without any attributes. To enable the support of
the [`script-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)
directive of the `Content-Security-Policy` header, provide
the [`nonce`](https://smikhalevski.github.io/react-executor/interfaces/ssr.SSRExecutorManagerOptions.html#nonce) option
to `SSRExecutorManager` or any of its subclasses:

```ts
const manager = new PipeableSSRExecutorManager(response, { nonce: '2726c7f26c' });
```

Send the header with this nonce in the server response:

```
Content-Security-Policy: script-src 'nonce-2726c7f26c'
```

## Next.js integration

> [!TIP]\
> Check out the live example
> of [the Next.js app](https://codesandbox.io/p/devbox/react-executor-next-example-whsj4v) that showcases
> streaming SSR with React Executor.

To enable client hydration in Next.js, use [`@react-executor/next`](https://github.com/smikhalevski/react-executor-next)
package.

First, provide
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html): 

```tsx
// providers.tsx
'use client';

import { ReactNode } from 'react';
import { enableSSRHydration, ExecutorManager, ExecutorManagerProvider } from 'react-executor';
import { SSRExecutorManager } from 'react-executor/ssr';
import { ExecutorHydrator } from '@react-executor/next';

const manager = typeof window !== 'undefined' ? enableSSRHydration(new ExecutorManager()) : undefined;

export function Providers(props: { children: ReactNode }) {
  return (
    <ExecutorManagerProvider value={manager || new SSRExecutorManager()}>
      <ExecutorHydrator>{props.children}</ExecutorHydrator>
    </ExecutorManagerProvider>
  );
}
```

`ExecutorHydrator` propagates server-rendered executor state to the client. You can configure how dehydrated state is
[serialized on the server and deserialized on the client](#state-serialization), by default `JSON` is used.

Enable providers in the root layout:

```tsx
// layout.tsx
import { ReactNode } from 'react';
import { Providers } from './providers';

export default function (props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
```

# Devtools

To inspect the current state of executors in your app, install the
[React Executor Devtools](https://chromewebstore.google.com/detail/react-executor-devtools/achlflelpafnlpepfpfhildkahbfhgjc)
browser extension and open its panel in the Chrome Developer Tools:

<br/>
<p align="center">
  <img
    alt="React Executor Devtools Screenshot"
    src="https://raw.githubusercontent.com/smikhalevski/react-executor-devtools/master/assets/screenshot.png"
    width="640"
  />
</p>
<br/>

Devtools extension doesn't require any additional configuration and provides introspection to all executors on the
page, regardless if they were rendered through React or created outside of the rendering process.

To disable devtools, create a custom
[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react_executor.ExecutorManager.html):

```ts
import { ExecutorManager } from 'react-executor';

const opaqueExecutorManager = new ExecutorManager({
  devtools: false
});
```

Executors created by the `opaqueExecutorManager` won't be visible in the React Executor Devtools extension. It is
recommended to use this setting in production.

The extension source can be found in the [react-executor-devtools](https://github.com/smikhalevski/react-executor-devtools)
repo.

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
  const account = await accountExecutor.getOrAwait();
  
  // Fetch shopping cart for an account
});
```

In this example, the component is subscribed to both account and a shopping cart executors, and re-rendered if their
state is changed. To avoid unnecessary re-renders, you can acquire an executor through the manager:

```tsx
const shoppingCartExecutor = useExecutor('shoppingCart', async (signal, executor) => {
  
  // 1️⃣ Wait for the account executor to be created
  const accountExecutor = await executor.manager.getOrAwait('account');
  
  // 2️⃣ Wait for the account executor to be settled
  const account = await accountExecutor.getOrAwait();

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
const manager = useExecutorManager();

for (const executor of manager) {
  executor.invalidate();
}
```

By default, invalidating an executor has no additional effect. If you want to
[retry the latest task](#retry-the-latest-task) that each executor has executed, use
[`retry`](https://smikhalevski.github.io/react-executor/interfaces/react_executor.Executor.html#retry):

```ts
for (const executor of manager) {
  executor.retry();
}
```

It isn't optimal to retry all executors even if they aren't [actively used](#activate-an-executor). Use the
[`retryInvalidated`](https://smikhalevski.github.io/react-executor/modules/plugin_retryInvalidated.html) to retry active
executors when they are invalidated.

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
const manager = new ExecutorManager();

// Prefetch the shopping cart
manager.getOrCreate('shoppingCart', fetchShoppingCart);

const App = () => (
  <ExecutorManagerProvider value={manager}>
    {/* Render you app here */}
  </ExecutorManagerProvider>
);
```

<hr/>

<p align="center">
Illustration by <a href="https://www.slackart.com/">Michael Slack</a>
</p>

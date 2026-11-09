<p align="center">
  <a href="#readme"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img alt="React Executor" src="./assets/logo-light.png" width="500" />
  </picture></a>
</p>

<br/>

<!--ARTICLE-->

<!--OVERVIEW-->

Asynchronous task execution and state management for React.

- TypeScript first.
- Expressive and concise API with strict typings.
- Works great with SSR and Suspense.
- [Extensible with plugins.](#plugins)
- [First class devtools.](#devtools)
- [Just 3&#8239;kB gzipped.](https://bundlephobia.com/package/react-executor)
- Check out the [Cookbook](#cookbook) for real-life examples!

<!--/OVERVIEW-->

<br>

```sh
npm install --save-prod react-executor
```

<br>

<!--/ARTICLE-->

<!--TOC-->

<span class="toc-icon">🔰&ensp;</span>[**Introduction**](#introduction)

- [Executor keys](#executor-keys)
- [Execute a task](#execute-a-task)
- [Abort a task](#abort-a-task)
- [Replace a task](#replace-a-task)
- [Wait for a task to complete](#wait-for-a-task-to-complete)
- [Retry the latest task](#retry-the-latest-task)
- [Settle an executor](#settle-an-executor)
- [Clear an executor](#clear-an-executor)
- [Optimistic updates](#optimistic-updates)

<span class="toc-icon">📢&ensp;</span>[**Events and lifecycle**](#events-and-lifecycle)

- [Activate an executor](#activate-an-executor)
- [Invalidate results](#invalidate-results)
- [Detach an executor](#detach-an-executor)

<span class="toc-icon">🔌&ensp;</span>[**Plugins**](#plugins)

- [`abortDeactivated`](#abortdeactivated)
- [`abortPendingAfter`](#abortpendingafter)
- [`abortWhen`](#abortwhen)
- [`detachDeactivated`](#detachdeactivated)
- [`detachInactive`](#detachinactive)
- [`invalidateAfter`](#invalidateafter)
- [`invalidateByPeers`](#invalidatebypeers)
- [`invalidatePeers`](#invalidatepeers)
- [`invalidateWhen`](#invalidatewhen)
- [`lazyTask`](#lazytask)
- [`rejectPendingAfter`](#rejectpendingafter)
- [`resolveBy`](#resolveby)
- [`retryActivated`](#retryactivated)
- [`retryFulfilled`](#retryfulfilled)
- [`retryInvalidated`](#retryinvalidated)
- [`retryRejected`](#retryrejected)
- [`retryWhen`](#retrywhen)
- [`syncBrowserStorage`](#syncbrowserstorage)
- [`syncExternalStore`](#syncexternalstore)

<span class="toc-icon">👁️&ensp;</span>[**Observables**](#observables)

- [`navigatorOnline`](#navigatoronline)
- [`navigatorOffline`](#navigatoroffline)
- [`windowFocused`](#windowfocused)
- [`windowBlurred`](#windowblurred)

<span class="toc-icon">⚛️&ensp;</span>[**React integration**](#react-integration)

- [Suspense](#suspense)
- [External executors](#external-executors)

<span class="toc-icon">🚀&ensp;</span>[**Server-side rendering**](#server-side-rendering)

- [Render to string](#render-to-string)
- [Streaming SSR](#streaming-ssr)
- [State serialization](#state-serialization)
- [Content-Security-Policy support](#content-security-policy-support)
- [Next.js integration](#nextjs-integration)

<span class="toc-icon">⚙️&ensp;</span>[**Devtools**](#devtools)

<span class="toc-icon">🍪&ensp;</span>**Cookbook**

- [Dependent tasks](#dependent-tasks)
- [Derived executors](#derived-executors)
- [Pagination](#pagination)
- [Infinite scroll](#infinite-scroll)
- [Invalidate all executors](#invalidate-all-executors)
- [Prefetching](#prefetching)
- [Storage state versioning](#storage-state-versioning)
- [Global loading indicator](#global-loading-indicator)

<span class="toc-icon">🔎&ensp;</span>**Resources**

- [API docs](https://smikhalevski.github.io/react-executor/)
- [TODO app example](https://stackblitz.com/edit/react-executor-todo-app?file=README.md)
- [Streaming SSR example](https://codesandbox.io/p/devbox/react-executor-ssr-streaming-example-mwrmrs)
- [Next.js integration example](https://codesandbox.io/p/devbox/react-executor-next-example-whsj4v)

<!--/TOC-->

<!--ARTICLE-->

# Introduction

An executor runs a task, stores the execution result, and provides access to that result. Tasks are callbacks that
return a value or throw an error.

An [`Executor`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html) is created and
managed by
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html),
which controls the executor's lifecycle:

```ts
import { ExecutorManager } from 'react-executor';

const manager = new ExecutorManager();

const rookyExecutor = manager.getOrCreate('rooky');
// ⮕ Executor<any>
```

Each executor has a unique key within the manager's scope. In this example, we created a new executor with the key
`'rooky'`. The manager creates a new executor when you call
[`getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#getorcreate)
with a previously unused key. Subsequent calls with the same key return the same executor instance.

If you want to retrieve an existing executor by its key and avoid creating a new one if it doesn't exist, use
[`get`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#get):

```ts
manager.get('bobby');
// ⮕ undefined

manager.get('rooky');
// ⮕ Executor<any>
```

The executor we created is _unsettled_, meaning it stores neither a value nor a failure reason:

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

An initial value may be a task callback (which will be executed), a promise (which the executor will await), or any
other value that immediately fulfills the executor. Read more in the [Execute a task](#execute-a-task) and
the [Settle an executor](#settle-an-executor) sections.

When creating an executor, you can also provide an array of plugins:

```ts
import retryRejected from 'react-executor/plugin/retryRejected';

const rookyExecutor = manager.getOrCreate('rooky', 42, [retryRejected()]);
```

Plugins can subscribe to [executor events](#events-and-lifecycle) or modify the executor instance. If plugins settle
the executor or start a task, the initial value isn't applied. Read more about plugins in the [Plugins](#plugins)
section.

## Executor keys

Anything can be an executor key: a string, a number, an object, etc. By default, keys are considered identical if
their [`JSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)-serialized form
is identical:

```ts
const manager = new ExecutorManager();

const userExecutor = manager.getOrCreate(['user', 123]);

manager.get(['user', 123]);
// ⮕ userExecutor
```

Pass the
[`keyIdGenerator`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.ExecutorManagerOptions.html#keyidgenerator)
option to the `ExecutorManager` constructor to change how key IDs are computed. Keys with the same ID refer to the same
executor. A key ID can be anything: a string, an object, etc.

If you're using objects as executor keys, then you may want to use a stable serialized form of keys as key IDs (where
object properties are sorted alphabetically). In this case, use any library that supports stable JSON serialization:

```ts
import JSONMarshal from 'json-marshal';

const manager = new ExecutorManager({
  keyIdGenerator: key => JSONMarshal.stringify(key, { isStable: true }),
});

const rookyExecutor = manager.getOrCreate({ id: 123, name: 'Rooky' });
// ⮕ Executor<any>

// 🟡 Key properties are listed in a different order
manager.get({ name: 'Rooky', id: 123 });
// ⮕ rookyExecutor
```

> [!TIP]\
> With additional configuration, [json-marshal](https://github.com/smikhalevski/json-marshal#readme) can stringify and
> parse any data structure.

If you want to use object references as executor key IDs, provide an identity function:

```ts
const manager = new ExecutorManager({
  keyIdGenerator: key => key,
});

const rookyKey = { id: 123 };

const rookyExecutor = manager.getOrCreate(rookyKey);

// 🟡 Executors are different because different objects were used as keys
manager.get(rookyKey) !== manager.getOrCreate({ id: 123 });
```

## Execute a task

Let's execute a new task:

```ts
import { ExecutorManager, ExecutorTaskCallback } from 'react-executor';

const manager = new ExecutorManager();

const rookyExecutor = manager.getOrCreate('rooky');

const helloTask: ExecutorTaskCallback = async (signal, executor) => 'Hello';

const helloPromise = rookyExecutor.execute(helloTask);
// ⮕ AbortablePromise<any>
```

`helloTask` receives an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
and `rookyExecutor` as arguments. The signal is aborted if the task is [aborted](#abort-a-task) or
[replaced](#replace-a-task).

While tasks can be synchronous or asynchronous, executors always handle them in an asynchronous fashion. The executor
is marked as [pending](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#ispending)
immediately after
[`execute`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#execute)
is called:

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
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#task)
it has executed:

```ts
rookyExecutor.task;
// ⮕ helloTask
```

If a task throws an error (or returns a promise that rejects with an error), then the promise returned by `execute` is
rejected. Until then, the executor stays pending:

```ts
const ooopsPromise = rookyExecutor.execute(() => {
  throw new Error('Ooops!');
});

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
[`isPending`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#ispending),
you can access the previous value or failure reason. Use
[`isFulfilled`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#isfulfilled)
and
[`isRejected`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#isrejected)
to check how the executor was settled the last time. An executor cannot be both fulfilled and rejected at the same
time.

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
the [`execute`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#execute)
method is [abortable](https://smikhalevski.github.io/parallel-universe/classes/AbortablePromise.html),
so the task can be aborted prematurely. Results of the aborted task are discarded:

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
the [signal status](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/aborted) to stop computations that are
no longer needed.

For example, if you're fetching data from the server inside a task, you can pass the signal as
a [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch#signal) option:

```ts
const byeTask: ExecutorTaskCallback = async (signal, executor) => {
  const response = await fetch('/bye', { signal });

  return response.json();
};
```

## Replace a task

If a new task is executed while another task is pending, then the pending task is aborted and its results are
discarded:

```ts
executor.execute(async signal => 'Pluto');

await executor.execute(async signal => 'Mars');

executor.value;
// ⮕ 'Mars'
```

## Wait for a task to complete

In the [Execute a task](#execute-a-task) section we used the promise returned by
[`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#execute)
to wait for a task to complete. While this approach lets you wait for a particular task to settle, usually you need to
wait for the executor itself to become settled. The main point here is that the executor remains pending while multiple
tasks [replace one another](#replace-a-task).

[`getOrAwait`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#getorawait)
waits until the executor is settled and has no pending task. Let's consider the scenario where a task is replaced with
another task:

```ts
const planetExecutor = manager.getOrCreate('planet');

// The promise is resolved only when planetExecutor is settled
const planetPromise = planetExecutor.getOrAwait();

const marsPromise = planetExecutor.execute(async signal => 'Mars');

// 🟡 marsPromise is aborted, because the task was replaced
const venusPromise = planetExecutor.execute(async signal => 'Venus');

await planetPromise;
// ⮕ 'Venus'
```

In this example, `marsPromise` is aborted, and `planetPromise` is resolved only after the executor itself is settled
and has no pending task.

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
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#task),
use [`retry`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#retry):

```ts
const planets = ['Mars', 'Venus'];

await executor.execute(() => planets.shift());

executor.retry();

await executor.getOrAwait();

executor.value;
// ⮕ 'Venus'
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

An executor can be synchronously fulfilled via
[`resolve`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#resolve):

```ts
executor.resolve('Venus');

executor.isFulfilled;
// ⮕ true

executor.value;
// ⮕ 'Venus'
```

Or rejected
via [`reject`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#reject):

```ts
executor.reject(new Error('Ooops!'));

executor.isRejected;
// ⮕ true

executor.reason;
// ⮕ Error('Ooops!')
```

If there is a pending task then invoking `resolve` or `reject` will [abort it](#abort-a-task).

If you pass a promise to `resolve`, the executor stays pending until the promise settles, and then stores its result:

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
becomes [settled](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#issettled),
it remains settled until it is cleared.

You can reset the executor back to its unsettled state
using [`clear`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#clear):

```ts
executor.clear();
```

Clearing an executor removes the stored value and reason, but _doesn't_ affect the pending task execution and preserves
the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#task)
that was executed.

## Optimistic updates

Optimistic updates are a UX technique where the UI reflects the result of an action instantly, before the server has
confirmed it. If the server succeeds, nothing changes visually. If the server fails, the UI rolls back to the value it
showed before the action.

In React Executor, optimistic updates are first-class citizens and can be achieved by providing
[`pendingValue`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.ExecutorTask.html#pendingvalue)
in an executor task. When a task is submitted with a `pendingValue`, the executor is resolved with that value instantly,
while the task is pending, and stores a checkpoint of the previous state.

```ts
const executor = useExecutor('meaningOfLife');

const handleClick = () => {
  executor.execute({
    callback: async signal => await getTheMeaningOfLife(signal),

    // 🟡 Executor is resolved with this value while the callback is pending
    pendingValue: 42,
  });
};
```

The UI reflects `42` the moment the button is clicked. What happens next depends on the outcome of the task:

- If the task is _fulfilled_, then the executor is resolved with the task result.

- If the task is _rejected_, then the checkpoint is restored and the executor is rejected with the task error, like
  after any other failed task. The value that the executor held before `execute` was called is still available as
  [`executor.value`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#value),
  so you can keep rendering it next to the error — no manual snapshot required.

- If the task is _aborted_ or replaced, then the checkpoint is restored as is: the executor gets back the value or
  the reason it held before, or becomes unsettled if it wasn't settled.

This means `pendingValue` is safe to use regardless of whether the executor has ever successfully fetched data.

> [!NOTE]
> An optimistic task becomes
> the [latest task](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#task), so
> plugins that [retry the latest task](#retry-the-latest-task) would run it again. If the task is a mutation, set
> [`preserveLatestTask`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.ExecutorTask.html#preservelatesttask)
> to keep the previous task as the latest one:
>
> ```ts
> executor.execute({
>   callback: async signal => await saveTheMeaningOfLife(42, signal),
>   pendingValue: 42,
>   preserveLatestTask: true,
> });
> ```

# Events and lifecycle

Executors publish various events when their state changes. To subscribe to executor events, use the
[`subscribe`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#subscribe)
method:

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

You can subscribe to the executor manager to receive events from all executors. For example, you can automatically
retry any invalidated executor:

```ts
manager.subscribe(event => {
  if (event.type === 'invalidated') {
    event.target.retry();
  }
});
```

Both executors and managers can have multiple subscribers, and each subscriber receives
[events](https://smikhalevski.github.io/react-executor/interfaces/react-executor.ExecutorEvent.html)
of the following types:

<dl>
<dt>attached</dt>
<dd>

The executor was created, plugins were applied to it, and it was attached to the manager. Read more about plugins in
the [Plugins](#plugins) section.

</dd>

<dt>detached</dt>
<dd>

The executor was detached: it was removed from the manager and all of its subscribers were unsubscribed. Read more in
the [Detach an executor](#detach-an-executor) section.

</dd>

<dt>activated</dt>
<dd>

The executor was inactive and became active: a consumer started to observe its state. Read more in
the [Activate an executor](#activate-an-executor) section.

</dd>

<dt>deactivated</dt>
<dd>

The executor was active and became inactive: the last consumer stopped observing its state. Read more in
the [Activate an executor](#activate-an-executor) section.

</dd>

<dt>pending</dt>
<dd>

The executor started to [execute a task](#execute-a-task). You can find the latest task in the
[`Executor.task`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#task)
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

The pending [task was aborted](#abort-a-task). If the executor is
still [pending](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#ispending)
when this event is published, the aborted task was [replaced](#replace-a-task) with a new one.

Calling
[`Executor.execute`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#execute)
when handling this event may lead to a stack overflow. If you need to do so, execute the new task asynchronously, for
example with [`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask).

</dd>

<dt>cleared</dt>
<dd>

The executor was [cleared](#clear-an-executor) and isn't settled anymore.

</dd>

<dt>invalidated</dt>
<dd>

The executor result was [invalidated](#invalidate-results).

</dd>

<dt>annotated</dt>
<dd>

The [annotations](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#annotations)
of the executor were changed.

</dd>

<dt>plugin_configured</dt>
<dd>

The configuration of a plugin applied to the executor was changed.

</dd>
</dl>

## Activate an executor

Executors have
an [active](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#isactive)
status that tells whether the executor is observed by a consumer.

```ts
const deactivate = executor.activate();

executor.isActive;
// ⮕ true

deactivate();

executor.isActive;
// ⮕ false
```

If there are multiple consumers and each of them calls the `activate` method, then the executor remains active until
all of them call their deactivate callbacks.

By default, marking an executor as active has no additional effect. Plugins can check the executor active status to
skip or defer excessive updates and keep executor results up-to-date lazily. For example, consider a plugin
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
as [invalidated](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#isinvalidated).
If the executor isn't settled, `invalidate` is a no-op.

## Detach an executor

By default, executors that a manager has created are preserved indefinitely and are always available through
[`get`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#get).
This isn't always optimal, and you may want to detach an executor when it isn't needed anymore.
Use [`detach`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#detach)
in this case:

```ts
const executor = manager.getOrCreate('test');

manager.detach(executor.key);
// ⮕ true
```

All executor subscribers are now unsubscribed, and the executor is removed from the manager.

If an executor is still [active](#activate-an-executor), then it isn't detached, and `detach` returns `false`.

> [!NOTE]\
> A pending task isn't aborted when the executor is detached. Use the [`abortDeactivated`](#abortdeactivated) plugin to
> abort the task of a deactivated executor.

# Plugins

Plugins are callbacks that are invoked only once when the executor is created by the manager. For example, you can
create a plugin that aborts the pending task and [detaches an executor](#detach-an-executor) when it is
[deactivated](#activate-an-executor):

```ts
const detachPlugin: ExecutorPlugin = executor => {
  executor.subscribe(event => {
    if (event.type === 'deactivated') {
      executor.abort();
      executor.manager.detach(executor.key);
    }
  });
};
```

To apply a plugin, pass it to the
[`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#getorcreate)
or to the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react-executor.useExecutor.html)
hook:

```ts
const executor = manager.getOrCreate('test', undefined, [detachPlugin]);

const deactivate = executor.activate();

// The executor is instantly detached by the plugin
deactivate();

manager.get('test');
// ⮕ undefined
```

Make the manager apply a plugin to all executors by default:

```ts
const manager = new ExecutorManager({
  plugins: [detachPlugin],
});
```

> [!IMPORTANT]
> Plugins are applied in array order. When combining plugins that react to the same events, order matters. A good rule
> of thumb: plugins that _read_ state (e.g. [`syncBrowserStorage`](#syncbrowserstorage)) should come before plugins that
> _act_ on it (e.g. [`invalidateAfter`](#invalidateafter)), and cleanup plugins
> (e.g. [`abortDeactivated`](#abortdeactivated)) before lifecycle plugins
> (e.g. [`detachDeactivated`](#detachdeactivated)).

## `abortDeactivated`

[Aborts the pending task](#abort-a-task) after the delay if the executor is deactivated.

<!-- prettier-ignore -->
```ts
import abortDeactivated from 'react-executor/plugin/abortDeactivated';

const executor = useExecutor('test', heavyTask, [
  abortDeactivated({ delay: 2_000 }),
]);

const deactivate = executor.activate();

// Aborts heavyTask in 2 seconds
deactivate();
```

If an executor is reactivated during this delay, the task won't be aborted. The executor must be activated at least
once for this plugin to have an effect.

## `abortPendingAfter`

[Aborts the pending task](#abort-a-task)
with a [`TimeoutError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror) if
the task takes longer than the delay (in milliseconds).

<!-- prettier-ignore -->
```ts
import abortPendingAfter from 'react-executor/plugin/abortPendingAfter';

const executor = useExecutor('test', heavyTask, [
  abortPendingAfter(10_000),
]);
```

## `abortWhen`

[Aborts the pending task](#abort-a-task) if the
[observable](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Observable.html)
emits `true`.

For example, abort the pending task if the device is disconnected from the network for 5 seconds:

<!-- prettier-ignore -->
```ts
import abortWhen from 'react-executor/plugin/abortWhen';
import navigatorOffline from 'react-executor/observable/navigatorOffline';

const executor = useExecutor('test', heavyTask, [
  abortWhen(navigatorOffline, { delay: 5_000 }),
]);
```

By default, `abortWhen` only aborts the pending task. If `isSustained` is `true`, then after the delay has passed, every
new task is aborted as soon as it starts, until the observable emits `false`:

```ts
const executor = useExecutor('test', heavyTask, [
  abortWhen(navigatorOffline, {
    delay: 5_000,

    // 🟡 Abort every newly executed task
    isSustained: true,
  }),
]);
```

Read more about observables in the [Observables](#observables) section.

## `detachDeactivated`

[Detaches the executor](#detach-an-executor) after the delay if the executor is deactivated.

<!-- prettier-ignore -->
```ts
import detachDeactivated from 'react-executor/plugin/detachDeactivated';

const executor = useExecutor('test', heavyTask, [
  detachDeactivated({ delay: 2_000 }),
]);

const deactivate = executor.activate();

// Executor is detached in 2 seconds
deactivate();
```

If an executor is reactivated during this delay, the executor won't be detached. The executor must be activated at
least once for this plugin to have an effect.

This plugin doesn't abort the pending task when an executor is detached. Use [`abortDeactivated`](#abortdeactivated)
to do the job:

```ts
import abortDeactivated from 'react-executor/plugin/abortDeactivated';
import detachDeactivated from 'react-executor/plugin/detachDeactivated';

const executor = useExecutor('test', heavyTask, [
  abortDeactivated({ delay: 2_000 }),
  detachDeactivated({ delay: 2_000 }),
]);

const deactivate = executor.activate();

// The heavyTask is aborted and the executor is detached in 2 seconds
deactivate();
```

## `detachInactive`

[Detaches the executor](#detach-an-executor) after a delay if the executor is inactive.

Detach an executor if it wasn't activated during the first 5 seconds after being created:

<!-- prettier-ignore -->
```ts
import detachInactive from 'react-executor/plugin/detachInactive';

const executor = useExecutor('test', 42, [
  detachInactive({ delayBeforeActivated: 5_000 }),
]);
```

Detach an executor if it stays inactive for 5 seconds after being deactivated:

<!-- prettier-ignore -->
```ts
const executor = useExecutor('test', 42, [
  detachInactive({ delayAfterDeactivated: 5_000 }),
]);

const deactivate = executor.activate();

// The executor is detached in 5 seconds
deactivate();
```

## `invalidateAfter`

[Invalidates the executor result](#invalidate-results) after a delay (in milliseconds).

<!-- prettier-ignore -->
```ts
import invalidateAfter from 'react-executor/plugin/invalidateAfter';

// The executor is invalidated in 2 seconds
const executor = useExecutor('test', 42, [
  invalidateAfter(2_000),
]);
```

The delay is counted from the moment the executor was settled, and restarts every time the executor is settled again.

## `invalidateByPeers`

Invalidates the executor result if a peer executor is fulfilled or invalidated.

<!-- prettier-ignore -->
```ts
import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';

const cheeseExecutor = useExecutor('cheese', 'Burrata', [
  invalidateByPeers(executor => executor.key === 'bread'),
]);

const breadExecutor = useExecutor('bread');

// cheeseExecutor is invalidated
breadExecutor.resolve('Ciabatta');
```

Provide an array of executors as peers:

<!-- prettier-ignore -->
```ts
const breadExecutor = useExecutor('bread');

const cheeseExecutor = useExecutor('cheese', 'Burrata', [
  invalidateByPeers([breadExecutor]),
]);

// cheeseExecutor is invalidated
breadExecutor.resolve('Ciabatta');
```

## `invalidatePeers`

Invalidates peer executors if the executor is fulfilled or invalidated.

<!-- prettier-ignore -->
```ts
import invalidatePeers from 'react-executor/plugin/invalidatePeers';

const cheeseExecutor = useExecutor('cheese', 'Burrata', [
  invalidatePeers(executor => executor.key === 'bread'),
]);

const breadExecutor = useExecutor('bread', 'Focaccia');

// breadExecutor is invalidated
cheeseExecutor.resolve('Mozzarella');
```

Provide an array of executors as peers:

<!-- prettier-ignore -->
```ts
const breadExecutor = useExecutor('bread', 'Focaccia');

const cheeseExecutor = useExecutor('cheese', undefined, [
  invalidatePeers([breadExecutor]),
]);

// breadExecutor is invalidated
cheeseExecutor.resolve('Mozzarella');
```

## `invalidateWhen`

[Invalidates](#invalidate-results) the executor result when the
[observable](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Observable.html) switches from
`false` to `true`.

For example, if the device was offline for at least 5 seconds, then the executor is invalidated when the device goes
back online:

<!-- prettier-ignore -->
```ts
import invalidateWhen from 'react-executor/plugin/invalidateWhen';
import navigatorOnline from 'react-executor/observable/navigatorOnline';

const executor = useExecutor('test', heavyTask, [
  invalidateWhen(navigatorOnline, { delay: 5_000 }),
]);
```

Combining multiple plugins, you can set up a complex executor behaviour. For example, let's create an executor that
follows these requirements:

1. Executes the task every 5 seconds.
2. Aborts the pending task if the page is hidden for more than 10 seconds.
3. Aborts instantly if the device goes offline.
4. Resumes the periodic task execution if the page becomes visible or the device goes back online.

```ts
import { useExecutor } from 'react-executor';
import abortWhen from 'react-executor/plugin/abortWhen';
import invalidateWhen from 'react-executor/plugin/invalidateWhen';
import navigatorOffline from 'react-executor/observable/navigatorOffline';
import navigatorOnline from 'react-executor/observable/navigatorOnline';
import retryInvalidated from 'react-executor/plugin/retryInvalidated';
import retryFulfilled from 'react-executor/plugin/retryFulfilled';
import windowBlurred from 'react-executor/observable/windowBlurred';
import windowFocused from 'react-executor/observable/windowFocused';

useExecutor('test', heavyTask, [
  retryInvalidated(),

  // Retry the task every 5 seconds if it succeeds
  retryFulfilled({ delay: 5_000 }),

  // Abort the task if the page is hidden for at least 10 seconds
  abortWhen(windowBlurred, { delay: 10_000 }),

  // Abort the pending task if the device is disconnected from the network
  abortWhen(navigatorOffline),

  // Invalidate results when the page was hidden and then becomes visible
  invalidateWhen(windowFocused),

  // Invalidate results if the device was disconnected from the network
  // and then connects again
  invalidateWhen(navigatorOnline),
]);
```

## `lazyTask`

Sets the [latest task](#retry-the-latest-task) of an executor without executing it.

This plugin is useful when you have a static initial value and a task that can update this value later:

```ts
import lazyTask from 'react-executor/plugin/lazyTask';
import retryInvalidated from 'react-executor/plugin/retryInvalidated';

const executor = useExecutor('meaningOfLife', 42, [
  lazyTask(async () => await getTheMeaningOfLife()),
  retryInvalidated(),
]);
```

`executor` is created with the `value` set to 42. The `getTheMeaningOfLife` task isn't executed until the executor is
invalidated (thanks to the [`retryInvalidated`](#retryinvalidated) plugin):

```ts
executor.invalidate();
```

## `rejectPendingAfter`

[Aborts the pending task](#abort-a-task) and [rejects the executor](#settle-an-executor)
with a [`TimeoutError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror) if
the task takes longer than the delay (in milliseconds).

<!-- prettier-ignore -->
```ts
import rejectPendingAfter from 'react-executor/plugin/rejectPendingAfter';

const executor = useExecutor('test', heavyTask, [
  rejectPendingAfter(10_000),
]);
```

## `resolveBy`

[Resolves the executor](#settle-an-executor) with values emitted by an
[`Observable`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Observable.html). If the
observable emits a promise, the executor is resolved with its result.

<!-- prettier-ignore -->
```ts
import { Observable } from 'react-executor';
import resolveBy from 'react-executor/plugin/resolveBy';

const observable: Observable<string> = {
  subscribe(listener) {
    // Call the listener when value is changed
    const timer = setTimeout(listener, 1_000, 'Venus');

    return () => {
      // Unsubscribe the listener
      clearTimeout(timer);
    };
  },
};

const executor = useExecutor('planet', 'Mars', [
  resolveBy(observable),
]);
```

[`PubSub`](https://smikhalevski.github.io/parallel-universe/classes/PubSub.html) can be used to decouple the lazy data
source from the executor:

<!-- prettier-ignore -->
```ts
import { PubSub } from 'parallel-universe';

const pubSub = new PubSub<string>();

const executor = useExecutor('planet', 'Mars', [
  resolveBy(pubSub),
]);

pubSub.publish('Venus');

executor.value; // ⮕ 'Venus'
```

## `retryActivated`

[Retries the latest task](#retry-the-latest-task) if the executor is activated.

<!-- prettier-ignore -->
```ts
import retryActivated from 'react-executor/plugin/retryActivated';

const executor = useExecutor('test', heavyTask, [
  retryActivated(),
]);

// Retries the task
executor.activate();
```

Set the minimum time (in milliseconds) that must pass after the executor was settled for an activation to retry the
latest task:

<!-- prettier-ignore -->
```ts
const executor = useExecutor('test', heavyTask, [
  retryActivated({ delayAfterSettled: 5_000 }),
]);

// Doesn't retry the task if the executor was settled less than 5 seconds ago
executor.activate();
```

## `retryFulfilled`

[Retries the latest task](#retry-the-latest-task) after a delay every time the executor is fulfilled.

<!-- prettier-ignore -->
```ts
import retryFulfilled from 'react-executor/plugin/retryFulfilled';

const executor = useExecutor('test', heavyTask, [
  retryFulfilled(),
]);
```

If the task fails, is aborted, or if an executor is deactivated then the plugin stops the retry process.

With the default configuration, the plugin would infinitely retry the task of an [active](#activate-an-executor)
executor with a 5-second delay between retries. This is effectively a decent polling strategy that kicks in only if
someone is actually using an executor.

Specify the number of times the task should be re-executed if it succeeds:

```ts
retryFulfilled({ count: 3 });
```

Specify the delay (in milliseconds) between retries:

```ts
retryFulfilled({ count: 3, delay: 5_000 });
```

Provide a function that returns the delay depending on the number of retries:

```ts
retryFulfilled({
  count: 5,
  delay: (index, executor) => 1000 * index,
});
```

By default, `retryFulfilled` doesn't retry inactive executors. The executor is retried only after it becomes active.

To retry the latest task regardless of the executor activation status:

```ts
retryFulfilled({ isEager: true });
```

Use `retryFulfilled` in conjunction with [`retryRejected`](#retryrejected) to create a polling sequence. For example,
this configuration would infinitely poll the `heavyTask` and would retry failed iterations with an exponential backoff
and no more than 5 times in a row:

<!-- prettier-ignore -->
```ts
const executor = useExecutor('test', heavyTask, [
  retryFulfilled(),
  retryRejected({ count: 5 }),
]);
```

You can also use a combination of [`invalidateAfter`](#invalidateafter) and [`retryInvalidated`](#retryinvalidated)
to poll infinitely, regardless of the result of the previous iteration:

<!-- prettier-ignore -->
```ts
const executor = useExecutor('test', heavyTask, [
  invalidateAfter(5_000),
  retryInvalidated(),
]);
```

## `retryInvalidated`

[Retries the latest task](#retry-the-latest-task) if the executor is invalidated.

<!-- prettier-ignore -->
```ts
import retryInvalidated from 'react-executor/plugin/retryInvalidated';

const executor = useExecutor('test', heavyTask, [
  retryInvalidated(),
]);

executor.activate();
```

Combine this plugin with [`invalidateByPeers`](#invalidatebypeers) to automatically retry this executor when an
executor that it depends on is fulfilled or invalidated:

```ts
import { ExecutorTaskCallback, useExecutor } from 'react-executor';
import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';

const fetchCheese: ExecutorTaskCallback = async (signal, executor) => {
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

// cheeseExecutor is fulfilled with 'Mozzarella'
breadExecutor.resolve('Ciabatta');

// 🟡 Later, cheeseExecutor is invalidated and re-fetches cheese
breadExecutor.resolve('Focaccia');
```

Read more about [dependent tasks](#dependent-tasks).

By default, `retryInvalidated` doesn't retry inactive executors. The executor is retried only after it becomes active.

To retry the latest task regardless of the executor activation status:

```ts
retryInvalidated({ isEager: true });
```

## `retryRejected`

[Retries the latest task](#retry-the-latest-task) after a delay if the executor is rejected.

<!-- prettier-ignore -->
```ts
import retryRejected from 'react-executor/plugin/retryRejected';

const executor = useExecutor('test', heavyTask, [
  retryRejected(),
]);

executor.activate();
```

If the task succeeds, is aborted, or if an executor is deactivated then the plugin stops the retry process.

With the default configuration, the plugin would retry the task 3 times with an exponential backoff between retries:
1000, 1800, and 3240 milliseconds.

Specify the number of times the task should be re-executed if it fails:

```ts
retryRejected({ count: 3 });
```

Specify the delay (in milliseconds) between retries:

```ts
retryRejected({ count: 3, delay: 5_000 });
```

Provide a function that returns the delay depending on the number of retries:

```ts
retryRejected({
  count: 5,
  delay: (index, executor) => 1000 * 1.8 ** index,
});
```

By default, `retryRejected` doesn't retry inactive executors. The executor is retried only after it becomes active.

To retry the latest task regardless of the executor activation status:

```ts
retryRejected({ isEager: true });
```

## `retryWhen`

[Retries the latest task](#retry-the-latest-task) when the
[observable](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Observable.html) switches from
`false` to `true`.

For example, the executor would retry the `heavyTask` after the device has been back online for 5 seconds:

<!-- prettier-ignore -->
```ts
import retryWhen from 'react-executor/plugin/retryWhen';
import navigatorOnline from 'react-executor/observable/navigatorOnline';

const executor = useExecutor('test', heavyTask, [
  retryWhen(navigatorOnline, { delay: 5_000 }),
]);
```

## `syncBrowserStorage`

Synchronizes the executor state with a `localStorage` or `sessionStorage` item. No-op in a non-browser environment.

```ts
import syncBrowserStorage from 'react-executor/plugin/syncBrowserStorage';

const executor = useExecutor('test', 42, [syncBrowserStorage()]);
```

With this plugin, you can synchronize the executor state
[across multiple browser tabs](https://stackblitz.com/edit/react-executor-todo-app?file=README.md) in just one line.

> [!IMPORTANT]\
> If the executor is [detached](#detach-an-executor), then the corresponding item is removed from the storage.

By default, an executor state is serialized using
[`JSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON). If your executor stores
a value that may contain circular references, or non-serializable data like `BigInt`, use a custom serializer.

Here's how you can enable serialization of objects with circular references:

```ts
import JSONMarshal from 'json-marshal';

const executor = useExecutor('test', 42, [
  syncBrowserStorage({
    serializer: JSONMarshal,
  }),
]);
```

> [!TIP]\
> With additional configuration, [json-marshal](https://github.com/smikhalevski/json-marshal#readme) can stringify and
> parse any data structure.

By default, the `syncBrowserStorage` plugin uses the [executor key ID](#executor-keys) as a storage key, which must be
a string. You can provide a custom key via the
[`storageKey`](https://smikhalevski.github.io/react-executor/interfaces/plugin_syncBrowserStorage.SyncBrowserStorageOptions.html#storagekey)
option:

```ts
useExecutor('test', 42, [syncBrowserStorage({ storageKey: 'hello' })]);
```

## `syncExternalStore`

Synchronizes the executor state with an external store. The store is updated when the executor state changes, and the
executor is updated when the stored state changes.

Here's a minimal external store example:

```ts
import { useExecutor, ExecutorState } from 'react-executor';
import syncExternalStore, { ExternalStore } from 'react-executor/plugin/syncExternalStore';

let myStoredState: ExecutorState | null = null;

const myStore: ExternalStore<ExecutorState> = {
  get() {
    return myStoredState;
  },

  subscribe(listener) {
    // Place subscription logic here
    return () => {};
  },
};

const myExecutor = useExecutor('test', 42, [syncExternalStore(myStore)]);
```

When the executor is [settled](#settle-an-executor), [cleared](#clear-an-executor), [invalidated](#invalidate-results)
or annotated, the plugin calls the
[`ExternalStore.set`](https://smikhalevski.github.io/react-executor/interfaces/plugin_syncExternalStore.ExternalStore.html#set)
method on the store.

When the executor is [detached](#detach-an-executor), the plugin calls the
[`ExternalStore.delete`](https://smikhalevski.github.io/react-executor/interfaces/plugin_syncExternalStore.ExternalStore.html#delete)
method on the store.

Read-only stores, like the one above, can omit `set` and `delete`.

Prefer [`syncBrowserStorage`](#syncbrowserstorage) if you want to persist the executor state in `localStorage`
or `sessionStorage`.

# Observables

Observables are values that can be passed to the `abortWhen`, `invalidateWhen`, `retryWhen`, and `resolveBy` plugins.
They follow a minimal interface: a `subscribe` method that subscribes a listener to the values emitted by the
observable, and returns a callback that unsubscribes the listener. You can pass any object matching this interface —
including third-party reactive primitives — as an observable.

Four built-in observables are provided out of the box. Each of them emits the current state to a listener right after
it subscribes.

## `navigatorOnline`

Emits `true` when the device is connected to the network, and `false` when it is disconnected.

```ts
import retryWhen from 'react-executor/plugin/retryWhen';
import navigatorOnline from 'react-executor/observable/navigatorOnline';

const executor = useExecutor('test', heavyTask, [retryWhen(navigatorOnline)]);
```

## `navigatorOffline`

The inverse of `navigatorOnline`. Emits `true` when the device is disconnected.

```ts
import abortWhen from 'react-executor/plugin/abortWhen';
import navigatorOffline from 'react-executor/observable/navigatorOffline';

const executor = useExecutor('test', heavyTask, [abortWhen(navigatorOffline)]);
```

## `windowFocused`

Emits `true` when the page becomes visible or the window receives focus, and `false` when the page becomes hidden.

```ts
import retryWhen from 'react-executor/plugin/retryWhen';
import windowFocused from 'react-executor/observable/windowFocused';

const executor = useExecutor('test', heavyTask, [retryWhen(windowFocused)]);
```

## `windowBlurred`

The inverse of `windowFocused`. Emits `true` when the page becomes hidden.

```ts
import abortWhen from 'react-executor/plugin/abortWhen';
import windowBlurred from 'react-executor/observable/windowBlurred';

const executor = useExecutor('test', heavyTask, [abortWhen(windowBlurred)]);
```

# React integration

In the basic scenario, to use executors in your React app, you don't need any additional configuration, just use
the [`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react-executor.useExecutor.html)
hook right away:

```tsx
import { useExecutor } from 'react-executor';

function User(props: { userId: string }) {
  const executor = useExecutor(['user', props.userId], async signal => {
    // Fetch the user from the server
  });

  if (executor.isPending) {
    return 'Loading';
  }

  // Render the user from the executor.value
}
```

Every time the executor's state is changed, the component is re-rendered. The executor returned from the hook is
[activated](#activate-an-executor) after mount and deactivated before unmount.

The hook has the exact same signature as the
[`ExecutorManager.getOrCreate`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#getorcreate)
method, described in the [Introduction](#introduction) section.

> [!TIP]\
> Check out the live example
> of [the TODO app](https://stackblitz.com/edit/react-executor-todo-app?file=README.md) that employs
> React Executor.

You can use executors both inside and outside the rendering process. To do this, provide a custom
[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html)
through the context:

```tsx
import { ExecutorManager, ExecutorManagerProvider } from 'react-executor';

const manager = new ExecutorManager();

const App = () => (
  <ExecutorManagerProvider value={manager}>
    <User userId={'28'} />
  </ExecutorManagerProvider>
);
```

Now you can use `manager` to access all the same executors that are available through the `useExecutor` hook:

```ts
const executor = manager.get(['user', '28']);
```

If you want to have access to an executor in a component, but don't want to re-render the component when the executor's
state is changed, use the
[`useExecutorManager`](https://smikhalevski.github.io/react-executor/functions/react-executor.useExecutorManager.html)
hook:

```ts
const accountExecutor = useExecutorManager().getOrCreate('account');
```

You can execute a task in response to a user action, for example when a user clicks a button:

```tsx
const executor = useExecutor('test');

const handleClick = () => {
  executor.execute(async signal => {
    // Handle the task
  });
};
```

If you want the executor to run a task on the client only, then execute the task in an effect:

```ts
const executor = useExecutor('test');

useEffect(() => {
  executor.execute(async signal => {
    // Handle the task
  });
}, []);
```

## Suspense

Executors support the fetch-as-you-render approach and can be integrated with React Suspense. To suspend rendering
while an executor is pending, use the
[`useExecutorSuspense`](https://smikhalevski.github.io/react-executor/functions/react-executor.useExecutorSuspense.html)
hook:

```tsx
import { useExecutor, useExecutorSuspense } from 'react-executor';

function Account() {
  const accountExecutor = useExecutor('account', signal => {
    // Fetch an account from a server
  });

  // Suspend rendering if accountExecutor is pending and isn't fulfilled
  const account = useExecutorSuspense(accountExecutor).get();
}
```

Now when the `Account` component is rendered, it would be suspended until the `accountExecutor` is settled:

```tsx
import { Suspense } from 'react';

const App = () => (
  <Suspense fallback={'Loading'}>
    <Account />
  </Suspense>
);
```

Executors can run tasks in parallel and rendering is suspended until both of them are settled:

```ts
const cheeseExecutor = useExecutor('cheese', buyCheeseTask);
const breadExecutor = useExecutor('bread', bakeBreadTask);

const cheese = useExecutorSuspense(cheeseExecutor).get();
const bread = useExecutorSuspense(breadExecutor).get();
```

## External executors

You can use executors created outside the rendering process in your components, and re-render or suspend your
components when such executors are updated:

```ts
const manager = new ExecutorManager();

// 1️⃣ Create an executor
const accountExecutor = manager.getOrCreate('account', signal => {
  // Fetch an account from a server
});

function Account() {
  // 2️⃣ Re-render a component when accountExecutor is updated
  useExecutorSubscription(accountExecutor);

  // 3️⃣ Suspend rendering if accountExecutor is pending and isn't fulfilled
  const account = useExecutorSuspense(accountExecutor).get();
}
```

# Server-side rendering

> [!TIP]\
> Check out the live example
> of [streaming SSR](https://codesandbox.io/p/devbox/react-executor-ssr-streaming-example-mwrmrs) with React Executor.

Executors can be hydrated on the client after being settled on the server.

To enable hydration on the client, create the executor manager and provide it through a context:

```tsx
import { hydrateRoot } from 'react-dom/client';
import { hydrateExecutorManager, ExecutorManager, ExecutorManagerProvider } from 'react-executor';

const manager = new ExecutorManager();

// 🟡 Hydrates executors on the client with the server data
hydrateExecutorManager(manager);

hydrateRoot(
  document,
  <ExecutorManagerProvider value={manager}>
    <App />
  </ExecutorManagerProvider>
);
```

Here, `App` is the component that renders your application. Inside the `App` you can use `useExecutor` and
[`useExecutorSuspense`](#suspense) to load your data.

[`hydrateExecutorManager`](https://smikhalevski.github.io/react-executor/functions/react-executor.hydrateExecutorManager.html)
applies the executor states sent by the server to executors of the given manager. Only one manager can be hydrated on
a page: call `hydrateExecutorManager` only once on the client-side, otherwise it throws an error.

On the server-side, you can either render your app contents [as a string](#render-to-string) and send it to the client
in one go, or [stream the contents](#streaming-ssr).

## Render to string

Use [`SSRExecutorManager`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html)
to render your app as an HTML string:

```tsx
import { createServer } from 'node:http';
import { renderToString } from 'react-dom/server';
import { ExecutorManagerProvider } from 'react-executor';
import { SSRExecutorManager } from 'react-executor/ssr';

const server = createServer(async (request, response) => {
  // 1️⃣ Create a new manager for each request
  const manager = new SSRExecutorManager();

  // 2️⃣ Re-render until there are no more changes
  let html;
  do {
    html = renderToString(
      <ExecutorManagerProvider value={manager}>
        <App />
      </ExecutorManagerProvider>
    );
  } while (await manager.hasChanges());

  // 3️⃣ Inject the hydration script
  html = html.replace('</body>', manager.nextHydrationChunk() + '</body>');

  response.setHeader('Content-Type', 'text/html');
  response.end(html);
});

server.listen(8080);
```

A new executor manager must be created for each request, so the results that are stored in executors are served in
response to a particular request.

[`hasChanges`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html#haschanges)
waits until no executors are pending, and resolves with `true` if the state of any executor has changed while it
waited, or `false` otherwise.

> [!WARNING]
> If a plugin keeps re-executing tasks during SSR, the promise returned by `hasChanges` is rejected after `maxRetries`
> attempts (10 by default). Avoid such plugins in SSR. If your data is loaded in many sequential steps, pass a greater
> `maxRetries`, for example `manager.hasChanges(20)`.

[`nextHydrationChunk`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html#nexthydrationchunk)
returns a `<script>` tag that sends the client the states of executors that have changed since they were last sent,
or an empty string if there are no such changes. On the client, these states are applied to the manager passed to
[`hydrateExecutorManager`](https://smikhalevski.github.io/react-executor/functions/react-executor.hydrateExecutorManager.html).

## Streaming SSR

React can stream parts of your app while it is being rendered. You can inject React Executor hydration chunks into the
React stream.

```tsx
import { createServer } from 'node:http';
import { Writable } from 'node:stream';
import { renderToReadableStream } from 'react-dom/server';
import { ExecutorManagerProvider } from 'react-executor';
import { SSRExecutorManager } from 'react-executor/ssr';

const server = createServer(async (request, response) => {
  // 1️⃣ Create a new manager for each request
  const manager = new SSRExecutorManager();

  const stream = await renderToReadableStream(
    <ExecutorManagerProvider value={manager}>
      <App />
    </ExecutorManagerProvider>
  );

  const hydrator = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      controller.enqueue(manager.nextHydrationChunk());
    },
  });

  response.setHeader('Content-Type', 'text/html');

  // 2️⃣ Inject the hydration chunks into the react stream
  await stream.pipeThrough(hydrator).pipeTo(Writable.toWeb(response));

  response.end();
});

server.listen(8080);
```

`hydrator` injects React Executor hydration chunks into the React stream.

In the `App` component, use the combination
of [`<Suspense>`](https://react.dev/reference/react/Suspense),
[`useExecutor`](https://smikhalevski.github.io/react-executor/functions/react-executor.useExecutor.html) and
[`useExecutorSuspense`](https://smikhalevski.github.io/react-executor/functions/react-executor.useExecutorSuspense.html)
to suspend rendering while executors process their tasks:

```tsx
function App() {
  return (
    <html>
      <head />
      <body>
        <Suspense fallback={'Loading'}>
          <Hello />
        </Suspense>
      </body>
    </html>
  );
}

function Hello() {
  const helloExecutor = useExecutor('hello', async () => {
    // Asynchronously return the result
    return 'Hello, Paul!';
  });

  // 🟡 Suspend rendering until helloExecutor is settled
  useExecutorSuspense(helloExecutor);

  return helloExecutor.get();
}
```

If the `App` is rendered in streaming mode, it would first show "Loading" and after the executor is settled, it would
update to "Hello, Paul!". In the meantime `helloExecutor` on the client would be hydrated with the data from the
server.

## State serialization

By default, executor keys and states are serialized using
[`JSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON),
which has quite a few limitations. If your executor stores a value that may contain circular references, or
non-serializable data like `BigInt`, then a custom state serializer must be provided.

On the server, pass a
[`serializer`](https://smikhalevski.github.io/react-executor/interfaces/ssr.SSRExecutorManagerOptions.html#serializer)
option to [`SSRExecutorManager`](#render-to-string):

```ts
import { SSRExecutorManager } from 'react-executor/ssr';
import JSONMarshal from 'json-marshal';

const manager = new SSRExecutorManager({ serializer: JSONMarshal });
```

On the client, pass _the same_
[`serializer`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.HydrateExecutorManagerOptions.html#serializer)
to `hydrateExecutorManager`:

```tsx
import { hydrateRoot } from 'react-dom/client';
import { hydrateExecutorManager, ExecutorManager, ExecutorManagerProvider } from 'react-executor';
import JSONMarshal from 'json-marshal';

const manager = new ExecutorManager();

hydrateExecutorManager(manager, { serializer: JSONMarshal });

hydrateRoot(
  document,
  <ExecutorManagerProvider value={manager}>
    <App />
  </ExecutorManagerProvider>
);
```

> [!TIP]\
> With additional configuration, [json-marshal](https://github.com/smikhalevski/json-marshal#readme) can stringify and
> parse any data structure.

## Content-Security-Policy support

By default,
[`nextHydrationChunk`](https://smikhalevski.github.io/react-executor/classes/ssr.SSRExecutorManager.html#nexthydrationchunk)
returns an inline `<script>` tag without any attributes. To allow hydration scripts under
the [`script-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)
directive of the `Content-Security-Policy` header, provide
the [`nonce`](https://smikhalevski.github.io/react-executor/interfaces/ssr.SSRExecutorManagerOptions.html#nonce)
option to `SSRExecutorManager`:

```ts
const manager = new SSRExecutorManager({ nonce: '2726c7f26c' });
```

Send the header with this nonce in the server response:

```
Content-Security-Policy: script-src 'nonce-2726c7f26c'
```

## Next.js integration

> [!TIP]\
> Check out the live example
> of [the Next.js app](https://codesandbox.io/p/devbox/react-executor-next-example-whsj4v) that showcases streaming SSR
> with React Executor.

To enable client hydration in Next.js,
use the [`@react-executor/next`](https://github.com/smikhalevski/react-executor-next) package.

First, provide
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html):

```tsx
// providers.tsx
'use client';

import { ReactNode } from 'react';
import { hydrateExecutorManager, ExecutorManager, ExecutorManagerProvider } from 'react-executor';
import { SSRExecutorManager } from 'react-executor/ssr';
import { ExecutorHydrator } from '@react-executor/next';

let manager: ExecutorManager | undefined;

if (typeof window !== 'undefined') {
  manager = new ExecutorManager();
  hydrateExecutorManager(manager);
}

export function Providers(props: { children: ReactNode }) {
  return (
    <ExecutorManagerProvider value={manager || new SSRExecutorManager()}>
      <ExecutorHydrator>{props.children}</ExecutorHydrator>
    </ExecutorManagerProvider>
  );
}
```

`ExecutorHydrator` propagates server-rendered executor state to the client. You can configure how dehydrated state is
[serialized on the server and deserialized on the client](#state-serialization). By default, `JSON` is used.

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
[React Executor
Devtools](https://chromewebstore.google.com/detail/react-executor-devtools/achlflelpafnlpepfpfhildkahbfhgjc)
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

The devtools extension doesn't require any additional configuration and lets you inspect all executors on the page,
regardless of whether they were rendered through React or created outside of the rendering process.

To disable devtools, create a custom
[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html):

```ts
import { ExecutorManager } from 'react-executor';

const opaqueExecutorManager = new ExecutorManager({
  devtools: false,
});
```

Executors created by the `opaqueExecutorManager` won't be visible in the React Executor Devtools extension. It is
recommended to use this setting in production.

The extension source can be found in
the [react-executor-devtools](https://github.com/smikhalevski/react-executor-devtools) repo.

# Cookbook

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

In this example, the component is subscribed to both the account and the shopping cart executors, and is re-rendered if
their state is changed. To avoid unnecessary re-renders, you can acquire an executor through the manager:

```tsx
const shoppingCartExecutor = useExecutor('shoppingCart', async (signal, executor) => {
  // 1️⃣ Wait for the account executor to be created
  const accountExecutor = await executor.manager.getOrAwait('account');

  // 2️⃣ Wait for the account executor to be settled
  const account = await accountExecutor.getOrAwait();

  // Fetch shopping cart for an account
});
```

## Derived executors

An executor whose result depends on another executor can be re-computed automatically when that dependency changes.
Combine [`invalidateByPeers`](#invalidatebypeers) and [`retryInvalidated`](#retryinvalidated) to wire this up:

```ts
import { useExecutor } from 'react-executor';
import invalidateByPeers from 'react-executor/plugin/invalidateByPeers';
import retryInvalidated from 'react-executor/plugin/retryInvalidated';

const breadExecutor = useExecutor('bread', fetchBread);

const cheeseExecutor = useExecutor(
  'cheese',
  async signal => {
    const bread = await breadExecutor.getOrAwait();
    return bestCheeseFor(bread);
  },
  [invalidateByPeers([breadExecutor]), retryInvalidated()]
);
```

`cheeseExecutor` re-runs whenever `breadExecutor` is fulfilled or invalidated. For bidirectional invalidation — where
fulfilling either executor invalidates the other — add [`invalidatePeers`](#invalidatepeers) to both.

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

[`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html#iterator)
is iterable and provides access to all executors that it has created. You can perform batch operations with all
executors in a for-loop:

```ts
const manager = useExecutorManager();

for (const executor of manager) {
  executor.invalidate();
}
```

By default, invalidating an executor has no additional effect. If you want to
[retry the latest task](#retry-the-latest-task) that each executor has executed, use
[`retry`](https://smikhalevski.github.io/react-executor/interfaces/react-executor.Executor.html#retry):

```ts
for (const executor of manager) {
  executor.retry();
}
```

It isn't optimal to retry all executors even if they aren't [actively used](#activate-an-executor). Use the
[`retryInvalidated`](https://smikhalevski.github.io/react-executor/modules/plugin_retryInvalidated.html)
plugin to retry active executors when they are invalidated.

## Prefetching

In some cases, you can initialize an executor before its data is required for the first time:

```ts
const User = () => {
  useExecutorManager().getOrCreate('shoppingCart', fetchShoppingCart);
};
```

In this example, the executor with the `'shoppingCart'` key is initialized once the component is rendered for the
first time. The `User` component _won't be re-rendered_ if the state of this executor is changed.

To do prefetching before the application is even rendered, create an executor manager beforehand:

```tsx
const manager = new ExecutorManager();

// Prefetch the shopping cart
manager.getOrCreate('shoppingCart', fetchShoppingCart);

const App = () => <ExecutorManagerProvider value={manager}>{/* Render your app here */}</ExecutorManagerProvider>;
```

## Storage state versioning

You can store an executor state in `localStorage` using the [`syncBrowserStorage`](#syncbrowserstorage) plugin:

```ts
import { useExecutor } from 'react-executor';
import syncBrowserStorage from 'react-executor/plugin/syncBrowserStorage';

const playerExecutor = useExecutor('player', { health: '50%' }, [syncBrowserStorage()]);
// ⮕ Executor<{ health: string }>
```

But what if over time you'd like to change the structure of the value stored in the `playerExecutor`? For example,
make `health` property a number:

```ts
const playerExecutor = useExecutor('player', { health: 0.5 }, [syncBrowserStorage()]);
```

After users have used the previous version of the app where `health` was a string, they would still receive a string
value since the `playerExecutor` state is read from the `localStorage`:

```ts
playerExecutor.value.health;
// ⮕ '50%'
```

This may lead to unexpected behavior of your app. To mitigate this issue, let's write a plugin that would annotate
the executor with a version:

```ts
import { type ExecutorPlugin } from 'react-executor';

export function requireVersion(version: number): ExecutorPlugin {
  return executor => {
    if (executor.annotations.version === version) {
      // ✅ Executor is annotated with a correct version
      return;
    }

    // ❌ Clear the executor state and annotate it with a proper version
    executor.clear();
    executor.annotate({ version });
  };
}
```

Add the plugin to the executor:

```ts
const playerExecutor = useExecutor('player', { health: 0.5 }, [syncBrowserStorage(), requireVersion(1)]);
```

After the `syncBrowserStorage` plugin reads the data from the `localStorage`, the `requireVersion` plugin ensures that
the `version` annotation read from the `localStorage` matches the required version. On mismatch the executor is cleared
and the initial value `{ health: 0.5 }` is written to the storage.

```ts
playerExecutor.value.health;
// ⮕ 0.5
```

Bump the version provided to `requireVersion` plugin every time the structure of the executor value is changed.

We can enhance the `requireVersion` plugin by making it migrate the data instead of just clearing it:

```ts
export function requireVersion<T>(version: number, migrate: (executor: Executor<T>) => void): ExecutorPlugin<T> {
  return executor => {
    if (executor.annotations.version === version) {
      return;
    }

    // 🟡 Migrate only if executor has a value
    if (executor.isSettled) {
      migrate(executor);
    }

    executor.annotate({ version });
  };
}
```

Now `requireVersion` would apply the migration on the state version mismatch:

```ts
const playerExecutor = useExecutor('player', { health: 0.5 }, [
  syncBrowserStorage(),

  requireVersion(1, executor => {
    executor.resolve({
      health: parseInt(executor.get().health) / 100,
    });
  }),
]);
```

## Global loading indicator

To detect a global pending state we can rely on events published by
an [`ExecutorManager`](https://smikhalevski.github.io/react-executor/classes/react-executor.ExecutorManager.html):

```ts
function useIsPending(predicate = (executor: Executor) => true): boolean {
  const manager = useExecutorManager();
  const [isPending, setPending] = useState(false);

  useEffect(() => {
    const syncIsPending = () => {
      setPending(Array.from(manager).some(executor => predicate(executor) && executor.isPending));
    };

    // 1️⃣ Ensure isPending is up-to-date after mount
    syncIsPending();

    // 2️⃣ Sync isPending when any event is published
    return manager.subscribe(syncIsPending);
  }, [manager]);

  return isPending;
}
```

Now a global pending indicator can be shown when _any_ executor is pending:

```tsx
const isPending = useIsPending();

isPending && <LoadingIndicator />;
```

You can use a predicate to filter only executors that are actually fetching data. To do this, fetching executors should
be marked as such, for example with an annotation:

```ts
const accountExecutor = useExecutor(
  'account',

  () => fetch('/account'),

  // 1️⃣ Annotate an executor once via a plugin
  [executor => executor.annotate({ isFetching: true })]
);

// 2️⃣ Get global pending status for executors that are fetching data
const isPending = useIsPending(executor => executor.annotations.isFetching);
```

<!--/ARTICLE-->

<hr/>

<p align="center">:octocat: :heart:</p>

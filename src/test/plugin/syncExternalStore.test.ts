import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { Executor, ExecutorEvent, ExecutorManager, ExecutorState } from '../../main/index.js';
import syncExternalStore, { ExternalStore } from '../../main/plugin/syncExternalStore.js';
import { PubSub } from 'parallel-universe';

vi.useFakeTimers();
vi.setSystemTime(50);

const storePubSub = new PubSub<ExecutorState>();

const storeMock = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  subscribe: vi.fn(listener => storePubSub.subscribe(listener)),
} satisfies ExternalStore<ExecutorState>;

let listenerMock: Mock;
let manager: ExecutorManager;
let executor: Executor;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);

  storePubSub.unsubscribeAll();

  storeMock.get.mockReset();
  storeMock.set.mockReset();
  storeMock.delete.mockReset();
  storeMock.subscribe.mockReset();
});

test('overwrites empty store', () => {
  storeMock.get.mockReturnValueOnce(null);

  executor = manager.getOrCreate('xxx', undefined, [syncExternalStore(storeMock)]);

  expect(executor.isSettled).toBe(false);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);

  expect(storeMock.delete).not.toHaveBeenCalled();
});

test('overwrites outdated stored state', () => {
  storeMock.get.mockReturnValueOnce(null);

  executor = manager.getOrCreate('xxx', 111, [syncExternalStore(storeMock)]);

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'fulfilled',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.set).toHaveBeenCalledTimes(2);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);
  expect(storeMock.set).toHaveBeenNthCalledWith(2, {
    value: 111,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: true,
    reason: undefined,
    settledAt: 50,
  } satisfies ExecutorState);

  storePubSub.publish({
    value: 222,
    reason: undefined,
    annotations: {},
    settledAt: 20,
    invalidatedAt: 0,
    isFulfilled: true,
  });

  expect(listenerMock).toHaveBeenCalledTimes(3);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(3);
  expect(storeMock.set).toHaveBeenNthCalledWith(3, {
    value: 111,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: true,
    reason: undefined,
    settledAt: 50,
  } satisfies ExecutorState);

  expect(storeMock.delete).not.toHaveBeenCalled();
});

test('overwrites invalid stored state', () => {
  storeMock.get.mockReturnValueOnce({ aaa: 'bbb' });

  executor = manager.getOrCreate('xxx', undefined, [syncExternalStore(storeMock)]);

  expect(executor.isSettled).toBe(false);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.set).toHaveBeenCalledTimes(1);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);
});

test('uses the stored state as the initial state', () => {
  storeMock.get.mockReturnValueOnce({
    value: 111,
    reason: undefined,
    annotations: {},
    settledAt: 70,
    invalidatedAt: 0,
    isFulfilled: true,
  } satisfies ExecutorState);

  executor = manager.getOrCreate('xxx', undefined, [syncExternalStore(storeMock)]);

  expect(executor.isSettled).toBe(true);

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'fulfilled',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'attached',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
});

test('the store fulfills the executor', () => {
  storeMock.get.mockReturnValueOnce(null);

  executor = manager.getOrCreate('xxx', undefined, [syncExternalStore(storeMock)]);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);

  expect(storeMock.delete).not.toHaveBeenCalled();

  storePubSub.publish({
    value: 111,
    reason: undefined,
    annotations: {},
    settledAt: 70,
    invalidatedAt: 0,
    isFulfilled: true,
  });

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'fulfilled',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);

  expect(storeMock.delete).not.toHaveBeenCalled();

  expect(executor.isFulfilled).toBe(true);
  expect(executor.value).toBe(111);
});

test('the store rejects the executor', () => {
  storeMock.get.mockReturnValueOnce(null);

  executor = manager.getOrCreate('xxx', undefined, [syncExternalStore(storeMock)]);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);

  expect(storeMock.delete).not.toHaveBeenCalled();

  storePubSub.publish({
    value: undefined,
    reason: 111,
    annotations: {},
    settledAt: 70,
    invalidatedAt: 0,
    isFulfilled: false,
  });

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'rejected',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);

  expect(storeMock.delete).not.toHaveBeenCalled();

  expect(executor.settledAt).toBe(70);
  expect(executor.value).toBe(undefined);
  expect(executor.reason).toBe(111);
});

test('the store invalidates the executor', () => {
  storeMock.get.mockReturnValueOnce(null);

  executor = manager.getOrCreate('xxx', 333, [syncExternalStore(storeMock)]);

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'fulfilled',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(2);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);
  expect(storeMock.set).toHaveBeenNthCalledWith(2, {
    value: 333,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: true,
    reason: undefined,
    settledAt: 50,
  } satisfies ExecutorState);

  expect(storeMock.delete).not.toHaveBeenCalled();

  storePubSub.publish({
    value: 333,
    annotations: {},
    invalidatedAt: 60,
    isFulfilled: true,
    reason: undefined,
    settledAt: 50,
  });

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'invalidated',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(2);

  expect(storeMock.delete).not.toHaveBeenCalled();

  expect(executor.settledAt).toBe(50);
  expect(executor.invalidatedAt).toBe(60);
  expect(executor.value).toBe(333);
  expect(executor.reason).toBe(undefined);
});

test('the store annotates the executor', () => {
  storeMock.get.mockReturnValueOnce(null);

  executor = manager.getOrCreate('xxx', undefined, [syncExternalStore(storeMock)]);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'syncExternalStore', options: { store: storeMock } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);
  expect(storeMock.set).toHaveBeenNthCalledWith(1, {
    value: undefined,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: false,
    reason: undefined,
    settledAt: 0,
  } satisfies ExecutorState);

  expect(storeMock.delete).not.toHaveBeenCalled();

  storePubSub.publish({
    value: undefined,
    reason: undefined,
    annotations: { xxx: 'yyy' },
    settledAt: 0,
    invalidatedAt: 0,
    isFulfilled: false,
  });

  expect(listenerMock).toHaveBeenCalledTimes(3);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'annotated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);

  expect(storeMock.get).toHaveBeenCalledTimes(1);

  expect(storeMock.set).toHaveBeenCalledTimes(1);

  expect(storeMock.delete).not.toHaveBeenCalled();

  expect(executor.annotations).toEqual({ xxx: 'yyy' });
  expect(executor.settledAt).toBe(0);
  expect(executor.value).toBe(undefined);
  expect(executor.reason).toBe(undefined);
});

test('synchronizes the store and the executor', () => {
  let storedValue: any;

  const storePubSub = new PubSub<any>();

  const storeMock = {
    get() {
      return storedValue;
    },
    set(value) {
      storedValue = value;
      storePubSub.publish(value);
    },
    subscribe(listener) {
      return storePubSub.subscribe(listener);
    },
  } satisfies ExternalStore;

  executor = manager.getOrCreate('xxx', 111, [syncExternalStore(storeMock)]);

  expect(storedValue).toEqual({
    value: 111,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: true,
    reason: undefined,
    settledAt: 50,
  });

  vi.setSystemTime(70);

  executor.resolve(333);

  expect(storedValue).toEqual({
    value: 333,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: true,
    reason: undefined,
    settledAt: 70,
  });

  storeMock.set({
    value: 444,
    annotations: {},
    invalidatedAt: 0,
    isFulfilled: true,
    reason: undefined,
    settledAt: 80,
  });

  expect(executor.value).toBe(444);
  expect(executor.settledAt).toBe(80);
});

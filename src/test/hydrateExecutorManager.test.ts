/**
 * @vitest-environment jsdom
 */

import { beforeEach, expect, test, vi } from 'vitest';
import { hydrateExecutorManager, ExecutorManager, ExecutorState } from '../main/index.js';
import { Serializer } from '../main/types.js';

beforeEach(() => {
  window.__REACT_EXECUTOR_SSR_STATE__ = undefined;
});

test('hydrates an executor that is added after', () => {
  const manager = new ExecutorManager();

  hydrateExecutorManager(manager);

  window.__REACT_EXECUTOR_SSR_STATE__!.push(
    '"xxx"',
    JSON.stringify({
      isFulfilled: true,
      value: 111,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState)
  );

  const executor = manager.getOrCreate('xxx');

  expect(executor.value).toBe(111);
  expect(executor.settledAt).toBe(50);
});

test('hydrates multiple executors that are added after', () => {
  const manager = new ExecutorManager();

  hydrateExecutorManager(manager);

  window.__REACT_EXECUTOR_SSR_STATE__!.push(
    '"xxx"',
    JSON.stringify({
      isFulfilled: true,
      value: 111,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState),
    '"yyy"',
    JSON.stringify({
      isFulfilled: true,
      value: 222,
      reason: undefined,
      settledAt: 100,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState)
  );

  const executor1 = manager.getOrCreate('xxx');
  const executor2 = manager.getOrCreate('yyy');

  expect(executor1.value).toBe(111);
  expect(executor1.settledAt).toBe(50);
  expect(executor2.value).toBe(222);
  expect(executor2.settledAt).toBe(100);
});

test('hydrates an executor that was added before', () => {
  window.__REACT_EXECUTOR_SSR_STATE__ = [
    '"xxx"',
    JSON.stringify({
      isFulfilled: true,
      value: 111,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState),
  ];

  const manager = new ExecutorManager();

  hydrateExecutorManager(manager);

  const executor = manager.getOrCreate('xxx');

  expect(executor.value).toBe(111);
  expect(executor.settledAt).toBe(50);
});

test('hydrates executors that are added before and after', () => {
  window.__REACT_EXECUTOR_SSR_STATE__ = [
    '"xxx"',
    JSON.stringify({
      isFulfilled: true,
      value: 111,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState),
  ];

  const manager = new ExecutorManager();

  hydrateExecutorManager(manager);

  window.__REACT_EXECUTOR_SSR_STATE__!.push(
    '"yyy"',
    JSON.stringify({
      isFulfilled: true,
      value: 222,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState)
  );

  const executor1 = manager.getOrCreate('xxx');
  const executor2 = manager.getOrCreate('yyy');

  expect(executor1.value).toBe(111);
  expect(executor2.value).toBe(222);
});

test('throws if hydration is enabled twice', () => {
  const manager = new ExecutorManager();

  hydrateExecutorManager(manager);

  expect(() => hydrateExecutorManager(manager)).toThrow();
});

test('uses a custom serializer', () => {
  const manager = new ExecutorManager();
  const serializerMock: Serializer = {
    parse: vi.fn(JSON.parse),
    stringify: vi.fn(JSON.stringify),
  };

  hydrateExecutorManager(manager, { serializer: serializerMock });

  window.__REACT_EXECUTOR_SSR_STATE__!.push(
    '"xxx"',
    JSON.stringify({
      isFulfilled: true,
      value: 111,
      reason: undefined,
      settledAt: 50,
      invalidatedAt: 0,
      annotations: {},
    } satisfies ExecutorState)
  );

  const executor = manager.getOrCreate('xxx');

  expect(executor.value).toBe(111);

  expect(serializerMock.stringify).not.toHaveBeenCalled();
  expect(serializerMock.parse).toHaveBeenCalledTimes(2);
  expect(serializerMock.parse).toHaveBeenNthCalledWith(1, '"xxx"');
  expect(serializerMock.parse).toHaveBeenNthCalledWith(
    2,
    '{"isFulfilled":true,"value":111,"settledAt":50,"invalidatedAt":0,"annotations":{}}'
  );
});

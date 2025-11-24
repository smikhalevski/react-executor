/**
 * @vitest-environment jsdom
 */

import { beforeEach, expect, test, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { ExecutorEvent, ExecutorManager, ExecutorManagerProvider, useExecutor } from '../main/index.js';

let testIndex = 0;
let executorKey: string;

vi.useFakeTimers();

beforeEach(() => {
  vi.clearAllTimers();

  executorKey = 'executor' + testIndex++;
});

test('returns the same executor on every render', () => {
  const hook = renderHook(() => useExecutor(executorKey), { wrapper: StrictMode });
  const executor1 = hook.result.current;

  hook.rerender();

  const executor2 = hook.result.current;

  expect(executor1).toBe(executor2);
});

test('returns the same executor for an object key on every render', () => {
  const manager = new ExecutorManager({
    keyIdGenerator: JSON.stringify,
  });

  const hook = renderHook(() => useExecutor({ aaa: 111 }), {
    wrapper: props => (
      <StrictMode>
        <ExecutorManagerProvider value={manager}>{props.children}</ExecutorManagerProvider>
      </StrictMode>
    ),
  });

  const executor1 = hook.result.current;

  hook.rerender();

  const executor2 = hook.result.current;

  expect(executor1).toBe(executor2);
});

test('returns the same executor for an array-of-primitives key', () => {
  const manager = new ExecutorManager();

  const hook = renderHook(() => useExecutor(['xxx', 111]), {
    wrapper: props => (
      <StrictMode>
        <ExecutorManagerProvider value={manager}>{props.children}</ExecutorManagerProvider>
      </StrictMode>
    ),
  });

  const executor1 = hook.result.current;

  hook.rerender();

  const executor2 = hook.result.current;

  expect(executor1).toBe(executor2);
});

test('creates a blank Executor instance', () => {
  const renderMock = vi.fn(() => useExecutor(executorKey));

  const hook = renderHook(renderMock, { wrapper: StrictMode });
  const executor = hook.result.current;

  expect(executor.isActive).toBe(true);
  expect(executor.isPending).toBe(false);
  expect(executor.isFulfilled).toBe(false);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBeUndefined();
  expect(executor.reason).toBeUndefined();

  expect(renderMock).toHaveBeenCalledTimes(2);
});

test('creates an executor with the initial value', () => {
  const renderMock = vi.fn(() => useExecutor(executorKey, 'aaa'));

  const hook = renderHook(renderMock, { wrapper: StrictMode });
  const executor = hook.result.current;

  expect(executor.isActive).toBe(true);
  expect(executor.isPending).toBe(false);
  expect(executor.isFulfilled).toBe(true);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBe('aaa');
  expect(executor.reason).toBeUndefined();
  expect(executor.task).toBeNull();

  expect(renderMock).toHaveBeenCalledTimes(2);
});

test('creates an executor with the initial task', async () => {
  const taskMock = vi.fn(() => 'aaa');
  const renderMock = vi.fn(() => useExecutor(executorKey, taskMock));

  const hook = renderHook(renderMock, { wrapper: StrictMode });
  const executor = hook.result.current;

  expect(executor.isActive).toBe(true);
  expect(executor.isPending).toBe(true);
  expect(executor.isFulfilled).toBe(false);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBeUndefined();
  expect(executor.reason).toBeUndefined();
  expect(executor.task).toBe(taskMock);

  expect(taskMock).toHaveBeenCalledTimes(1);
  expect(renderMock).toHaveBeenCalledTimes(2);

  await act(() => executor.getOrAwait());

  expect(executor.isPending).toBe(false);
  expect(executor.isFulfilled).toBe(true);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBe('aaa');
  expect(executor.reason).toBeUndefined();
  expect(executor.task).toBe(taskMock);

  expect(renderMock).toHaveBeenCalledTimes(4);
});

test('re-renders after resolve', () => {
  const renderMock = vi.fn(() => useExecutor(executorKey));
  const hook = renderHook(renderMock, { wrapper: StrictMode });

  act(() => void hook.result.current.resolve('aaa'));

  expect(renderMock).toHaveBeenCalledTimes(4);
});

test('re-renders after reject', () => {
  const renderMock = vi.fn(() => useExecutor(executorKey));
  const hook = renderHook(renderMock, { wrapper: StrictMode });

  act(() => void hook.result.current.reject(new Error('expected')));

  expect(renderMock).toHaveBeenCalledTimes(4);
});

test('re-renders after task execute', async () => {
  const task = () => 'aaa';
  const renderMock = vi.fn(() => useExecutor(executorKey));
  const hook = renderHook(renderMock, { wrapper: StrictMode });
  const executor = hook.result.current;

  await act(() => executor.execute(task));

  expect(executor.isPending).toBe(false);
  expect(executor.isFulfilled).toBe(true);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBe('aaa');
  expect(executor.reason).toBeUndefined();
  expect(executor.task).toBe(task);

  expect(renderMock).toHaveBeenCalledTimes(6);
});

test('deactivates an executor when key changes after parent component render', async () => {
  const task = vi.fn();
  const listenerMock = vi.fn();

  const manager = new ExecutorManager();

  const Parent = (props: { executorKey: string }) => (
    <ExecutorManagerProvider value={manager}>
      <Child executorKey={props.executorKey} />
    </ExecutorManagerProvider>
  );

  const Child = (props: { executorKey: string }) => {
    useExecutor(props.executorKey, task, [executor => executor.subscribe(listenerMock)]);
    return null;
  };

  const { rerender } = await act(() => render(<Parent executorKey={'xxx'} />));

  expect(manager['_executors'].size).toBe(1);

  expect(manager.get('xxx')!.isActive).toBe(true);

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'attached',
    target: manager.get('xxx')!,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'pending',
    target: manager.get('xxx')!,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'activated',
    target: manager.get('xxx')!,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'fulfilled',
    target: manager.get('xxx')!,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);

  act(() => rerender(<Parent executorKey={'yyy'} />));

  vi.runAllTimers();

  expect(manager['_executors'].size).toBe(2);

  expect(manager.get('xxx')!.isActive).toBe(false);
  expect(manager.get('yyy')!.isActive).toBe(true);

  expect(listenerMock).toHaveBeenCalledTimes(8);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'attached',
    target: manager.get('yyy')!,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'pending',
    target: manager.get('yyy')!,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(7, {
    type: 'deactivated',
    target: expect.objectContaining({ key: 'xxx' }),
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(8, {
    type: 'activated',
    target: manager.get('yyy')!,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
});

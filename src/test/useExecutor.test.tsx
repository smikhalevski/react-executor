// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { ReactNode, StrictMode } from 'react';
import { ExecutorEvent, ExecutorManager, ExecutorManagerProvider, useExecutor } from '../main/index.js';
import { noop } from '../main/utils.js';

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

afterEach(() => {
  cleanup();
});

const wrapper = (props: { children: ReactNode }) => (
  <StrictMode>
    <ExecutorManagerProvider value={manager}>{props.children}</ExecutorManagerProvider>
  </StrictMode>
);

test('returns the same executor on every render', () => {
  const hook = renderHook(() => useExecutor('xxx'), { wrapper });
  const executor1 = hook.result.current;

  hook.rerender();

  const executor2 = hook.result.current;

  expect(executor1).toBe(executor2);
});

test('returns the same executor for an array-of-primitives key', () => {
  const hook = renderHook(() => useExecutor(['xxx', 111]), { wrapper });

  const executor1 = hook.result.current;

  hook.rerender();

  const executor2 = hook.result.current;

  expect(executor1).toBe(executor2);
});

test('creates a blank Executor instance', () => {
  const renderMock = vi.fn(() => useExecutor('xxx'));

  const hook = renderHook(renderMock, { wrapper });
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
  const renderMock = vi.fn(() => useExecutor('xxx', 'aaa'));

  const hook = renderHook(renderMock, { wrapper });
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
  const callbackMock = vi.fn().mockReturnValue('aaa');
  const renderMock = vi.fn(() => useExecutor('xxx', callbackMock));

  const hook = renderHook(renderMock, { wrapper });
  const executor = hook.result.current;

  expect(executor.isActive).toBe(true);
  expect(executor.isPending).toBe(true);
  expect(executor.isFulfilled).toBe(false);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBeUndefined();
  expect(executor.reason).toBeUndefined();
  expect(executor.task).toStrictEqual({ callback: callbackMock });

  expect(callbackMock).toHaveBeenCalledTimes(1);
  expect(renderMock).toHaveBeenCalledTimes(2);

  await act(() => executor.getOrAwait());

  expect(executor.isPending).toBe(false);
  expect(executor.isFulfilled).toBe(true);
  expect(executor.isRejected).toBe(false);
  expect(executor.value).toBe('aaa');
  expect(executor.reason).toBeUndefined();
  expect(executor.task).toStrictEqual({ callback: callbackMock });

  expect(renderMock).toHaveBeenCalledTimes(4);
});

test('re-renders after resolve', () => {
  const renderMock = vi.fn(() => useExecutor('xxx'));
  const hook = renderHook(renderMock, { wrapper });

  act(() => void hook.result.current.resolve('aaa'));

  expect(renderMock).toHaveBeenCalledTimes(4);
});

test('re-renders after reject', () => {
  const renderMock = vi.fn(() => useExecutor('xxx'));
  const hook = renderHook(renderMock, { wrapper });

  act(() => void hook.result.current.reject(new Error('expected')));

  expect(renderMock).toHaveBeenCalledTimes(4);
});

test('re-renders after task execute', async () => {
  const renderMock = vi.fn(() => useExecutor('xxx'));
  const hook = renderHook(renderMock, { wrapper });

  await act(() => hook.result.current.execute(noop));

  expect(renderMock).toHaveBeenCalledTimes(6);
});

test('deactivates an executor when key changes after parent component render', async () => {
  const listenerMock = vi.fn();

  const Parent = (props: { executorKey: string }) => (
    <ExecutorManagerProvider value={manager}>
      <Child executorKey={props.executorKey} />
    </ExecutorManagerProvider>
  );

  const Child = (props: { executorKey: string }) => {
    useExecutor(props.executorKey, noop, [executor => executor.subscribe(listenerMock)]);
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
    payload: { task: { callback: expect.any(Function) } },
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
    payload: { task: { callback: expect.any(Function) } },
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

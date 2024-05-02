import { act, renderHook } from '@testing-library/react';
import { createElement, StrictMode } from 'react';
import { ExecutorManager, ExecutorManagerProvider, useExecutor } from '../main';

describe('useExecutor', () => {
  let testIndex = 0;
  let executorKey: string;

  beforeEach(() => {
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
      keySerializer: JSON.stringify,
    });

    const hook = renderHook(() => useExecutor({ aaa: 111 }), {
      wrapper: props =>
        createElement(StrictMode, null, createElement(ExecutorManagerProvider, { value: manager }, props.children)),
    });

    const executor1 = hook.result.current;

    hook.rerender();

    const executor2 = hook.result.current;

    expect(executor1).toBe(executor2);
  });

  test('returns the same executor for an array-of-primitives key', () => {
    const manager = new ExecutorManager({
      keySerializer: key => key,
    });

    const hook = renderHook(() => useExecutor(['xxx', 111]), {
      wrapper: props =>
        createElement(StrictMode, null, createElement(ExecutorManagerProvider, { value: manager }, props.children)),
    });

    const executor1 = hook.result.current;

    hook.rerender();

    const executor2 = hook.result.current;

    expect(executor1).toBe(executor2);
  });

  test('creates a blank Executor instance', () => {
    const renderMock = jest.fn(() => useExecutor(executorKey));

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
    const renderMock = jest.fn(() => useExecutor(executorKey, 'aaa'));

    const hook = renderHook(renderMock, { wrapper: StrictMode });
    const executor = hook.result.current;

    expect(executor.isActive).toBe(true);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBeUndefined();
    expect(executor.latestTask).toBeNull();

    expect(renderMock).toHaveBeenCalledTimes(2);
  });

  test('creates an executor with the initial task', async () => {
    const taskMock = jest.fn(() => 'aaa');
    const renderMock = jest.fn(() => useExecutor(executorKey, taskMock));

    const hook = renderHook(renderMock, { wrapper: StrictMode });
    const executor = hook.result.current;

    expect(executor.isActive).toBe(true);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBeUndefined();
    expect(executor.reason).toBeUndefined();
    expect(executor.latestTask).toBe(taskMock);

    expect(taskMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(2);

    await act(() => executor.toPromise());

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBeUndefined();
    expect(executor.latestTask).toBe(taskMock);

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  test('re-renders after resolve', () => {
    const renderMock = jest.fn(() => useExecutor(executorKey));
    const hook = renderHook(renderMock, { wrapper: StrictMode });

    act(() => void hook.result.current.resolve('aaa'));

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  test('re-renders after reject', () => {
    const renderMock = jest.fn(() => useExecutor(executorKey));
    const hook = renderHook(renderMock, { wrapper: StrictMode });

    act(() => void hook.result.current.reject(new Error('expected')));

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  test('re-renders after task execute', async () => {
    const task = () => 'aaa';
    const renderMock = jest.fn(() => useExecutor(executorKey));
    const hook = renderHook(renderMock, { wrapper: StrictMode });
    const executor = hook.result.current;

    await act(() => executor.execute(task));

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBeUndefined();
    expect(executor.latestTask).toBe(task);

    expect(renderMock).toHaveBeenCalledTimes(4);
  });
});

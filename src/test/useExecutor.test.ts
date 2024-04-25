import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { useExecutor } from '../main';

describe('useExecutor', () => {
  let testIndex = 0;
  let executorId: string;

  beforeEach(() => {
    executorId = 'executor' + testIndex++;
  });

  test('returns the same executor on every render', () => {
    const hook = renderHook(() => useExecutor(executorId), { wrapper: StrictMode });
    const executor1 = hook.result.current;

    hook.rerender();

    const executor2 = hook.result.current;

    expect(executor1).toBe(executor2);
  });

  test('creates a blank Executor instance', () => {
    const renderMock = jest.fn(() => useExecutor(executorId));

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
    const renderMock = jest.fn(() => useExecutor(executorId, 'aaa'));

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
    const renderMock = jest.fn(() => useExecutor(executorId, taskMock));

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

    await act(() => executor.then());

    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe('aaa');
    expect(executor.reason).toBeUndefined();
    expect(executor.latestTask).toBe(taskMock);

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  test('re-renders after resolve', () => {
    const renderMock = jest.fn(() => useExecutor(executorId));
    const hook = renderHook(renderMock, { wrapper: StrictMode });

    act(() => void hook.result.current.resolve('aaa'));

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  test('re-renders after reject', () => {
    const renderMock = jest.fn(() => useExecutor(executorId));
    const hook = renderHook(renderMock, { wrapper: StrictMode });

    act(() => void hook.result.current.reject(new Error('expected')));

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  test('re-renders after task execute', async () => {
    const task = () => 'aaa';
    const renderMock = jest.fn(() => useExecutor(executorId));
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

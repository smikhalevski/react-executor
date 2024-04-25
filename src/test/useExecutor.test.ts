import { renderHook } from '@testing-library/react';
import { StrictMode, useId } from 'react';
import { useExecutor } from '../main';

describe('useExecutor', () => {
  test('returns the same executor on every render', () => {
    const hook = renderHook(() => useExecutor(useId()), { wrapper: StrictMode });
    const executor1 = hook.result.current;

    hook.rerender();

    const executor2 = hook.result.current;

    expect(executor1).toBe(executor2);
  });

  //   test('creates a blank Executor instance', () => {
  //     const hook = renderHook(() => useExecutor(), { wrapper: StrictMode });
  //     const executor = hook.result.current;
  //
  //     expect(executor.isPending).toBe(false);
  //     expect(executor.isFulfilled).toBe(false);
  //     expect(executor.isRejected).toBe(false);
  //     expect(executor.value).toBeUndefined();
  //     expect(executor.reason).toBeUndefined();
  //     expect(executor.promise).toBeNull();
  //   });
  //
  //   test('creates an executor with non-function initial result', () => {
  //     const hook = renderHook(() => useExecutor(111), { wrapper: StrictMode });
  //     const executor = hook.result.current;
  //
  //     expect(executor.isPending).toBe(false);
  //     expect(executor.isFulfilled).toBe(true);
  //     expect(executor.isRejected).toBe(false);
  //     expect(executor.value).toBe(111);
  //     expect(executor.reason).toBeUndefined();
  //     expect(executor.promise).toBeNull();
  //   });
  //
  //   test('creates an executor with synchronous function initial result', async () => {
  //     const hook = renderHook(() => useExecutor(() => 111), { wrapper: StrictMode });
  //     const executor = hook.result.current;
  //
  //     expect(executor.isPending).toBe(true);
  //     expect(executor.isFulfilled).toBe(false);
  //     expect(executor.isRejected).toBe(false);
  //     expect(executor.value).toBeUndefined();
  //     expect(executor.reason).toBeUndefined();
  //     expect(executor.promise).toBeInstanceOf(Promise);
  //
  //     await act(() => executor.promise);
  //   });
  //
  //   test('creates an executor with asynchronous function initial result', async () => {
  //     const hookMock = jest.fn(() => useExecutor(() => Promise.resolve(111), { disposition: 'server' }));
  //     const hook = renderHook(hookMock, { wrapper: StrictMode });
  //     const executor = hook.result.current;
  //
  //     expect(executor.isPending).toBe(true);
  //     expect(executor.isFulfilled).toBe(false);
  //     expect(executor.isRejected).toBe(false);
  //     expect(executor.value).toBeUndefined();
  //     expect(executor.reason).toBeUndefined();
  //     expect(executor.promise).toBeInstanceOf(Promise);
  //
  //     await act(() => executor.promise);
  //
  //     expect(hookMock).toHaveBeenCalledTimes(4);
  //     expect(executor.isPending).toBe(false);
  //     expect(executor.isFulfilled).toBe(true);
  //     expect(executor.isRejected).toBe(false);
  //     expect(executor.value).toBe(111);
  //     expect(executor.reason).toBeUndefined();
  //     expect(executor.promise).toBeNull();
  //   });
  //
  //   test('re-renders after resolve', () => {
  //     const hookMock = jest.fn(() => useExecutor());
  //     const hook = renderHook(hookMock, { wrapper: StrictMode });
  //
  //     act(() => void hook.result.current.resolve(111));
  //
  //     expect(hookMock).toHaveBeenCalledTimes(4);
  //   });
  //
  //   test('re-renders after reject', () => {
  //     const hookMock = jest.fn(() => useExecutor());
  //     const hook = renderHook(hookMock, { wrapper: StrictMode });
  //
  //     act(() => void hook.result.current.reject(111));
  //
  //     expect(hookMock).toHaveBeenCalledTimes(4);
  //   });
  //
  //   test('re-renders after synchronous callback execute', async () => {
  //     const hookMock = jest.fn(() => useExecutor());
  //     const hook = renderHook(hookMock, { wrapper: StrictMode });
  //
  //     await act(() => hook.result.current.execute(() => 111));
  //
  //     expect(hookMock).toHaveBeenCalledTimes(4);
  //   });
  //
  //   test('re-renders after asynchronous execute', async () => {
  //     const hookMock = jest.fn(() => useExecutor());
  //     const hook = renderHook(hookMock, { wrapper: StrictMode });
  //
  //     await act(() => hook.result.current.execute(() => Promise.resolve(111)));
  //
  //     expect(hookMock).toHaveBeenCalledTimes(4);
  //   });
});

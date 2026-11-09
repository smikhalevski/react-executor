// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { ExecutorManager, useExecutorManager } from '../main/index.js';

afterEach(() => {
  cleanup();
});

test('returns the same manager in all components if there is no provider', () => {
  const hook1 = renderHook(() => useExecutorManager());
  const hook2 = renderHook(() => useExecutorManager());

  expect(hook1.result.current).toBeInstanceOf(ExecutorManager);
  expect(hook1.result.current).toBe(hook2.result.current);
});

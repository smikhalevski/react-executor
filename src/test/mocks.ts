import type { ExecutorState } from '../main/index.ts';

export function mockExecutorState(overrides: Partial<ExecutorState> = {}): ExecutorState {
  return {
    isFulfilled: false,
    value: undefined,
    reason: undefined,
    annotations: {},
    settledAt: 0,
    invalidatedAt: 0,
    ...overrides,
  };
}

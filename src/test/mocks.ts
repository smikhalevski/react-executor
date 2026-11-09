import type { ExecutorState } from '../main/index.js';

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

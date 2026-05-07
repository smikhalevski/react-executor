import * as React from 'react';
import type { Executor } from './types.js';

/**
 * Suspends rendering until an executor satisfies a predicate.
 *
 * @example
 * // Suspend while the executor is pending, then get the settled value
 * const value = useExecutorSuspense(useExecutor('test', heavyTask)).get();
 *
 * @example
 * const cheeseExecutor = useExecutor('cheese', buyCheeseTask);
 * const breadExecutor = useExecutor('bread', bakeBreadTask);
 *
 * // Executors run in parallel; rendering suspends until both are settled
 * useExecutorSuspense(cheeseExecutor);
 * useExecutorSuspense(breadExecutor);
 *
 * @example
 * // Only suspend if the executor has never been fulfilled before (allow stale values through)
 * useExecutorSuspense(executor, executor => !executor.isSettled);
 *
 * @param executor The executor to suspend on.
 * @param shouldSuspend A predicate called on a {@link Executor.isPending pending} executor. If it returns `true`,
 * rendering is suspended until the executor settles. If it returns `false`, rendering continues immediately with
 * whatever state the executor currently holds. Only called when the executor is pending — non-pending executors
 * never trigger suspension regardless of this predicate.
 * Defaults to suspending whenever the executor is pending and not yet {@link Executor.isFulfilled fulfilled}.
 * @returns The executor, for chaining with {@link ReadonlyExecutor.get get} or
 * {@link ReadonlyExecutor.getOrDefault getOrDefault}.
 * @template Value The value stored by the executor.
 */
export function useExecutorSuspense<Value>(executor: Executor<Value>, shouldSuspend = isNotFulfilled): Executor<Value> {
  if (!executor.isPending || !shouldSuspend(executor)) {
    return executor;
  }

  // Backward compatibility
  if (typeof React.use !== 'function') {
    throw executor.getOrAwait();
  }

  React.use(executor.getOrAwait());
  return executor;
}

function isNotFulfilled(executor: Executor): boolean {
  return !executor.isFulfilled;
}

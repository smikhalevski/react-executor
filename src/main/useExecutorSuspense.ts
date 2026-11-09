import { use } from 'react';
import type { Executor } from './types.js';

/**
 * Suspends rendering while the executor is pending.
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
 * // Only suspend if the executor has never been settled before (allow stale values through)
 * useExecutorSuspense(executor, executor => !executor.isSettled);
 *
 * @param executor The executor to suspend on.
 * @param shouldSuspend A predicate that is called if the executor is {@link Executor.isPending pending}. If it
 * returns `true`, rendering is suspended until the executor settles. By default, rendering is suspended if the
 * executor isn't {@link Executor.isFulfilled fulfilled}.
 * @returns The executor, for chaining with {@link ReadonlyExecutor.get get} or
 * {@link ReadonlyExecutor.getOrDefault getOrDefault}.
 * @template Value The value stored by the executor.
 */
export function useExecutorSuspense<Value>(executor: Executor<Value>, shouldSuspend = isNotFulfilled): Executor<Value> {
  if (!executor.isPending || !shouldSuspend(executor)) {
    return executor;
  }

  use(executor.getOrAwait());
  return executor;
}

function isNotFulfilled(executor: Executor): boolean {
  return !executor.isFulfilled;
}

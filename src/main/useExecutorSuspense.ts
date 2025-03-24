import type { Executor } from './types';

/**
 * Suspends rendering until an executor satisfies a predicate.
 *
 * @example
 * // Suspend if executor is pending or get the current value
 * const value = useExecutorSuspense(useExecutor('test', heavyTask)).get();
 *
 * @example
 * const cheeseExecutor = useExecutor('cheese', buyCheeseTask);
 * const beadExecutor = useExecutor('bread', bakeBreadTask);
 *
 * // Executors run in parallel and rendering is suspended until both of them are settled
 * useExecutorSuspense(cheeseExecutor);
 * useExecutorSuspense(breadExecutor);
 *
 * @param executor The executors to get value of.
 * @param predicate The predicate which a pending executor must conform to suspend the rendering process. By default,
 * only non-fulfilled executors are awaited.
 * @returns The executor value.
 * @template Value The value stored by the executor.
 */
export function useExecutorSuspense<Value>(executor: Executor<Value>, predicate = isNotFulfilled): Executor<Value> {
  if (executor.isPending && predicate(executor)) {
    throw executor.getOrAwait();
  }
  return executor;
}

function isNotFulfilled(executor: Executor): boolean {
  return !executor.isFulfilled;
}

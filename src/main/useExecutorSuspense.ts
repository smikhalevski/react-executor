import type { Executor } from './types';

/**
 * Suspends rendering until an executor satisfies a predicate.
 *
 * @template Value The value stored by the executor.
 */
export function useExecutorSuspense(executor: Executor): void {
  if (executor.isPending && !executor.isFulfilled) {
    throw executor.getOrAwait();
  }
}

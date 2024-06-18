import type { Executor } from './types';
import { noop } from './utils';

/**
 * Suspends rendering until all of provided executors are settled.
 *
 * @param executors Executors to wait for.
 * @param predicate The predicate which a pending executor must conform to suspend the rendering process. By default,
 * only non-fulfilled executors are awaited.
 * @template T Executors to wait for.
 */
export function useExecutorSuspense<T extends Executor | Executor[]>(
  executors: T,
  predicate = (executor: Executor) => !executor.isFulfilled
): T {
  if (Array.isArray(executors)) {
    const promises = [];

    for (const executor of executors) {
      if (executor.isPending && predicate(executor)) {
        promises.push(executor.getOrAwait().then(noop, noop));
      }
    }
    if (promises.length !== 0) {
      throw Promise.all(promises);
    }
  } else if (executors.isPending && predicate(executors)) {
    throw executors.getOrAwait().then(noop, noop);
  }

  return executors;
}

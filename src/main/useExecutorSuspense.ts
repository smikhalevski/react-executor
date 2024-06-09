import type { Executor } from './types';
import { noop } from './utils';

/**
 * Suspends rendering until all of provided executors are settled.
 *
 * @param executors Executors to wait for.
 * @returns Provided executors.
 * @template T Executors to wait for.
 */
export function useExecutorSuspense<T extends Executor | Executor[]>(executors: T): T {
  if (Array.isArray(executors)) {
    const promises = executors.reduce(reducePending, null);

    if (promises !== null) {
      throw Promise.all(promises).then(noop, noop);
    }
  } else if (executors.isPending) {
    throw executors.getOrAwait().then(noop, noop);
  }
  return executors;
}

function reducePending(promises: PromiseLike<unknown>[] | null, executor: Executor): PromiseLike<unknown>[] | null {
  if (executor.isPending) {
    if (promises === null) {
      promises = [];
    }
    promises.push(executor.getOrAwait().then(noop, noop));
  }
  return promises;
}

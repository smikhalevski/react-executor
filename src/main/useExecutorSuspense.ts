import type { Executor } from './types';

/**
 * Suspends rendering until the provided executor is settled.
 *
 * @param executor The executor to wait for.
 * @returns The provided executor.
 * @template Value The value stored by the executor.
 */
export function useExecutorSuspense<Value>(executor: Executor<Value>): Executor<Value>;

/**
 * Suspends rendering until all of provided executors are settled.
 *
 * @param executors Executors to wait for.
 * @returns Provided executors.
 * @template Executors Executors to wait for.
 */
export function useExecutorSuspense<Executors extends Executor[]>(executors: Executors): Executors;

export function useExecutorSuspense(executors: Executor | Executor[]) {
  if (Array.isArray(executors)) {
    const promises = executors.reduce(reducePending, null);

    if (promises !== null) {
      throw Promise.allSettled(promises).then(noop, noop);
    }
  } else if (executors.isPending) {
    throw executors.then(noop, noop);
  }

  return executors;
}

function reducePending(promises: PromiseLike<unknown>[] | null, executor: Executor): PromiseLike<unknown>[] | null {
  if (executor.isPending) {
    if (promises === null) {
      promises = [executor];
    } else {
      promises.push(executor);
    }
  }
  return promises;
}

function noop() {}

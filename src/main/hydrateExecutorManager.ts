import type { ExecutorManager } from './ExecutorManager.ts';
import type { Serializer } from './types.ts';

/**
 * Options provided to {@link hydrateExecutorManager}.
 */
export interface HydrateExecutorManagerOptions {
  /**
   * Parses executor keys and state snapshots that were captured during SSR.
   *
   * @default JSON
   */
  serializer?: Serializer;
}

/**
 * Enables SSR hydration for the executor manager: the executor states that the server sent during SSR are applied to
 * executors of this manager.
 *
 * **Note:** Only one executor manager can be hydrated on a page.
 *
 * @param manager The executor manager to hydrate.
 * @param options Hydration options.
 * @throws {Error} If hydration was already enabled on this page.
 */
export function hydrateExecutorManager(manager: ExecutorManager, options: HydrateExecutorManagerOptions = {}): void {
  const { serializer = JSON } = options;

  const ssrState =
    typeof window.__REACT_EXECUTOR_SSR_STATE__ !== 'undefined' ? window.__REACT_EXECUTOR_SSR_STATE__ : undefined;

  if (ssrState !== undefined && !Array.isArray(ssrState)) {
    throw new Error('Executor manager hydration has already begun');
  }

  window.__REACT_EXECUTOR_SSR_STATE__ = {
    push() {
      for (let i = 0; i < arguments.length; i += 2) {
        manager.hydrate(serializer.parse(arguments[i]), serializer.parse(arguments[i + 1]));
      }
    },
  };

  if (ssrState !== undefined) {
    window.__REACT_EXECUTOR_SSR_STATE__.push.apply(undefined, ssrState);
  }
}

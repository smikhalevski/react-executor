import type { ExecutorManager } from './ExecutorManager.js';
import type { Serializer } from './types.js';

/**
 * Options provided to {@link enableSSRHydration}.
 */
export interface SSRHydrationOptions {
  /**
   * Parses executor keys and state snapshots that were captured during SSR.
   *
   * @default JSON
   */
  serializer?: Serializer;
}

/**
 * Enables the SSR hydration for the given executor.
 *
 * **Note:** SSR hydration can be enabled only for one executor manager.
 *
 * @param manager The executor manager for which SSR hydration must be enabled.
 * @param options Additional options.
 * @returns The provided executor manager.
 * @template T The executor manager.
 */
export function enableSSRHydration<T extends ExecutorManager>(manager: T, options: SSRHydrationOptions = {}): T {
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

  return manager;
}

import type { ExecutorManager } from './ExecutorManager';
import type { ExecutorState } from './types';

/**
 * Options provided to {@link enableSSRHydration}.
 */
export interface SSRHydrationOptions {
  /**
   * Parses the executor state that was captured during SSR.
   *
   * @param stateStr The state to parse.
   */
  stateParser?: (stateStr: string) => ExecutorState;
}

/**
 * Enables the SSR hydration for the given executor.
 *
 * **Note:** SSR hydration can be enabled for one executor only.
 *
 * @param manager The executor manager for which SSR hydration must be enabled.
 * @param options Additional options.
 * @returns The provided executor manager.
 * @template T The executor manager.
 */
export function enableSSRHydration<T extends ExecutorManager>(manager: T, options: SSRHydrationOptions = {}): T {
  const { stateParser = JSON.parse } = options;

  const ssrState =
    typeof window.__REACT_EXECUTOR_SSR_STATE__ !== 'undefined' ? window.__REACT_EXECUTOR_SSR_STATE__ : undefined;

  if (Array.isArray(ssrState)) {
    for (const stateStr of ssrState) {
      manager.hydrate(stateParser(stateStr));
    }
  } else if (ssrState !== undefined) {
    throw new Error('SSR hydration already enabled');
  }

  window.__REACT_EXECUTOR_SSR_STATE__ = {
    push() {
      for (let i = 0; i < arguments.length; ++i) {
        manager.hydrate(stateParser(arguments[i]));
      }
    },
  };

  return manager;
}

import { createContext, useContext } from 'react';
import { ExecutorManager } from './ExecutorManager.ts';

const ExecutorManagerContext = createContext(new ExecutorManager());

/**
 * > — Big man in a suit of armour. Take that off, what are you?
 * >
 * > — Executor, manager, provider.
 *
 * Provides an {@link ExecutorManager} to descendant components.
 */
export const ExecutorManagerProvider = ExecutorManagerContext.Provider;

/**
 * Returns the executor manager provided by the closest {@link ExecutorManagerProvider}, or the default manager if
 * there's no provider.
 */
export function useExecutorManager(): ExecutorManager {
  return useContext(ExecutorManagerContext);
}

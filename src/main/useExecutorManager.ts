import { createContext, useContext } from 'react';
import { ExecutorManager } from './ExecutorManager';

const ExecutorManagerContext = createContext(new ExecutorManager());

/**
 * > — Big man in a suit of armour. Take that off, what are you?
 * >
 * > — Executor, manager, provider.
 *
 * The provides the manager that retrieves and creates executors.
 */
export const ExecutorManagerProvider = ExecutorManagerContext.Provider;

/**
 * Returns the current executor manager.
 */
export function useExecutorManager(): ExecutorManager {
  return useContext(ExecutorManagerContext);
}

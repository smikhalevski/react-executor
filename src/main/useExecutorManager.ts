import { useContext } from 'react';
import { ExecutorManager } from './ExecutorManager';
import { ExecutorManagerContext } from './ExecutorManagerContext';

/**
 * Returns the current executor manager.
 */
export function useExecutorManager(): ExecutorManager {
  return useContext(ExecutorManagerContext);
}

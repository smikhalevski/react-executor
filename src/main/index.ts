/**
 * The module with the core React Executor functionality.
 *
 * ```ts
 * import { useExecutor } from 'react-executor';
 * ```
 *
 * @module react-executor
 */

export { ExecutorManager } from './ExecutorManager';
export { useExecutor } from './useExecutor';
export { useExecutorManager, ExecutorManagerProvider } from './useExecutorManager';
export { useExecutorSubscription } from './useExecutorSubscription';
export { useExecutorSuspense } from './useExecutorSuspense';

export type {
  Executor,
  ExecutorAnnotations,
  ExecutorEvent,
  ExecutorState,
  ExecutorPlugin,
  ExecutorTask,
} from './types';

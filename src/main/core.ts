/**
 * The core React Executor functionality that doesn't depend on React.
 *
 * ```ts
 * import { ExecutorManager } from 'react-executor/core';
 * ```
 *
 * @module core
 */

export { hydrateExecutorManager, type HydrateExecutorManagerOptions } from './hydrateExecutorManager.ts';
export { ExecutorManager, type ExecutorManagerOptions } from './ExecutorManager.ts';
export type {
  Executor,
  ExecutorEventType,
  ExecutorEvent,
  ExecutorState,
  ExecutorPlugin,
  ExecutorTask,
  ExecutorTaskCallback,
  Observable,
  PartialExecutorEvent,
  ReadonlyExecutor,
  Serializer,
} from './types.ts';

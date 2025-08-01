/**
 * The core React Executor functionality that doesn't depend on React.
 *
 * ```ts
 * import { ExecutorManager } from 'react-executor/core';
 * ```
 *
 * @module core
 */

export { enableSSRHydration } from './enableSSRHydration.js';
export { ExecutorManager } from './ExecutorManager.js';

export type { SSRHydrationOptions } from './enableSSRHydration.js';
export type { ExecutorManagerOptions } from './ExecutorManager.js';
export type {
  Executor,
  ExecutorAnnotations,
  ExecutorEventType,
  ExecutorEvent,
  ExecutorState,
  ExecutorPlugin,
  ExecutorTask,
  Observable,
  PartialExecutorEvent,
  ReadonlyExecutor,
  Serializer,
} from './types.js';

/**
 * The core React Executor functionality that doesn't depend on React.
 *
 * ```ts
 * import { ExecutorManager } from 'react-executor/core';
 * ```
 *
 * @module core
 */

export { enableSSRHydration } from './enableSSRHydration';
export { ExecutorManager } from './ExecutorManager';

export type { SSRHydrationOptions } from './enableSSRHydration';
export type { ExecutorManagerOptions } from './ExecutorManager';
export type {
  Executor,
  ExecutorAnnotations,
  ExecutorEvent,
  ExecutorState,
  ExecutorPlugin,
  ExecutorTask,
  Observable,
} from './types';

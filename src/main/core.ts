/**
 * The core React Executor functionality that doesn't depend on React.
 *
 * ```ts
 * import { ExecutorManager } from 'react-executor/core';
 * ```
 *
 * @module core
 */

export { hydrateExecutorManager, type HydrateExecutorManagerOptions } from './hydrateExecutorManager.js';
export { ExecutorManager, type ExecutorManagerOptions } from './ExecutorManager.js';
export {
  type Executor,
  type ExecutorAnnotations,
  type ExecutorEventType,
  type ExecutorEvent,
  type ExecutorState,
  type ExecutorPlugin,
  type ExecutorTask,
  type Observable,
  type PartialExecutorEvent,
  type ReadonlyExecutor,
  type Serializer,
} from './types.js';

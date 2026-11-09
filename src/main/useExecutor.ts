import type { Executor, ExecutorPlugin, ExecutorTaskCallback, NoInfer } from './types.ts';
import { useExecutorManager } from './useExecutorManager.ts';
import { useExecutorSubscription } from './useExecutorSubscription.ts';

/**
 * Returns an existing executor or creates a new one using the current {@link ExecutorManager}. Components that use
 * the same key get the same executor.
 *
 * The component is re-rendered when the executor state changes. The executor is activated after mount and
 * deactivated before unmount.
 *
 * @param key The unique executor key.
 * @param initialValue The initial value of a new executor: a value, a promise, or a task callback to execute.
 * @param plugins Plugins that are applied to a new executor.
 * @returns The executor associated with the key.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value = any>(
  key: unknown,
  initialValue: undefined,
  plugins?: Array<ExecutorPlugin<Value> | null | undefined>
): Executor<Value>;

/**
 * Returns an existing executor or creates a new one using the current {@link ExecutorManager}. Components that use
 * the same key get the same executor.
 *
 * The component is re-rendered when the executor state changes. The executor is activated after mount and
 * deactivated before unmount.
 *
 * @param key The unique executor key.
 * @param initialValue The initial value of a new executor: a value, a promise, or a task callback to execute.
 * @param plugins Plugins that are applied to a new executor.
 * @returns The executor associated with the key.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value = any>(
  key: unknown,
  initialValue?: ExecutorTaskCallback<Value> | PromiseLike<Value> | Value,
  plugins?: Array<ExecutorPlugin<NoInfer<Value>> | null | undefined>
): Executor<Value>;

export function useExecutor(
  key: unknown,
  initialValue?: unknown,
  plugins?: Array<ExecutorPlugin | null | undefined>
): Executor {
  const executor = useExecutorManager().getOrCreate(key, initialValue, plugins);

  useExecutorSubscription(executor);

  return executor;
}

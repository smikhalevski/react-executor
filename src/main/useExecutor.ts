import type { Executor, ExecutorPlugin, ExecutorTask, NoInfer } from './types';
import { useExecutorManager } from './useExecutorManager';
import { useExecutorSubscription } from './useExecutorSubscription';

/**
 * Gets an existing executor or create a new executor using the {@link ExecutorManager}.
 *
 * All hook usages with the same key, return the same {@link Executor} instance.
 *
 * The component is re-rendered when an executor's state is changed. The executor is activated after mount and
 * deactivated before unmount.
 *
 * @param key The unique executor key.
 * @param initialValue The initial executor value that is applied when executor is created by the executor manager.
 * @param plugins The array of plugins that are applied to the newly created executor.
 * @returns The executor associated with the key.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value = any>(
  key: unknown,
  initialValue: undefined,
  plugins?: Array<ExecutorPlugin<Value> | null | undefined>
): Executor<Value>;

/**
 * Gets an existing executor or create a new executor using the {@link ExecutorManager}.
 *
 * All hook usages with the same key, return the same {@link Executor} instance.
 *
 * The component is re-rendered when an executor's state is changed. The executor is activated after mount and
 * deactivated before unmount.
 *
 * @param key The unique executor key.
 * @param initialValue The initial executor value that is applied when executor is created by the executor manager.
 * @param plugins The array of plugins that are applied to the newly created executor.
 * @returns The executor associated with the key.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value = any>(
  key: unknown,
  initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
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

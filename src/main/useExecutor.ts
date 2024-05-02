import { useDebugValue, useEffect, useState } from 'react';
import type { Executor, ExecutorPlugin, ExecutorTask, NoInfer } from './types';
import { useExecutorManager } from './useExecutorManager';

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
  key: string,
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
  key: string,
  initialValue?: ExecutorTask<Value> | PromiseLike<Value> | Value,
  plugins?: Array<ExecutorPlugin<NoInfer<Value>> | null | undefined>
): Executor<Value>;

/**
 * Re-renders the component to changes of the executor's state. The executor is activated after mount and deactivated
 * before unmount.
 *
 * @param executor The executor to subscribe to.
 * @returns The executor that was passed as an argument.
 * @template Value The value stored by the executor.
 */
export function useExecutor<Value>(executor: Executor<Value>): Executor<Value>;

export function useExecutor(
  keyOrExecutor: string | Executor,
  initialValue?: unknown,
  plugins?: Array<ExecutorPlugin | null | undefined>
): Executor {
  const manager = useExecutorManager();
  const executor =
    typeof keyOrExecutor === 'string' ? manager.getOrCreate(keyOrExecutor, initialValue, plugins) : keyOrExecutor;
  const [, setVersion] = useState(executor.version);

  useDebugValue(executor, toJSON);

  useEffect(() => {
    const provideVersion = (prevVersion: number) => Math.max(prevVersion, executor.version);

    const deactivate = executor.activate();
    const unsubscribe = executor.subscribe(() => {
      setVersion(provideVersion);
    });

    setVersion(provideVersion);

    return () => {
      unsubscribe();
      deactivate();
    };
  }, [executor]);

  return executor;
}

function toJSON(executor: Executor) {
  return executor.toJSON();
}

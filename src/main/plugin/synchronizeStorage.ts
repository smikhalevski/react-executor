/**
 * The plugin that persists the executor value in the synchronous storage.
 *
 * ```ts
 * import synchronizeStorage from 'react-executor/plugin/synchronizeStorage';
 *
 * const executor = useExecutor('test', 42, [
 *   synchronizeStorage(localStorage)
 * ]);
 * ```
 *
 * @module plugin/synchronizeStorage
 */

import { ExecutorImpl } from '../ExecutorImpl';
import type { Executor, ExecutorPlugin, ExecutorState, PluginConfiguredPayload } from '../types';
import { emptyObject } from '../utils';

/**
 * Serializes and deserializes values.
 *
 * @template Value The value to serialize.
 */
export interface Serializer<Value> {
  /**
   * Serializes a value as a string.
   *
   * @param value The value to serialize.
   */
  stringify(value: Value): string;

  /**
   * Deserializes a stringified value.
   *
   * @param valueStr The stringified value.
   */
  parse(valueStr: string): Value;
}

/**
 * Options of the {@link synchronizeStorage} plugin.
 */
export interface SynchronizeStorageOptions<Value> {
  /**
   * The storage record serializer.
   */
  serializer?: Serializer<ExecutorState<Value>>;

  /**
   * A storage key, or a callback that returns the storage key.
   *
   * By default, a serialized {@link Executor.key} is used as a storage key.
   */
  storageKey?: string | ((executor: Executor) => string);
}

/**
 * Persists the executor value in the synchronous storage.
 *
 * Synchronization is enabled only for activated executors. If executor is detached, then the corresponding item is
 * removed from the storage.
 *
 * @param storage The storage where executor value is persisted, usually a `localStorage` or a `sessionStorage`.
 * @param options Additional options.
 * @template Value The value persisted in the storage.
 */
export default function synchronizeStorage<Value = any>(
  storage: Pick<Storage, 'setItem' | 'getItem' | 'removeItem'>,
  options: SynchronizeStorageOptions<Value> = emptyObject
): ExecutorPlugin<Value> {
  const { serializer = JSON, storageKey } = options;

  return executor => {
    const executorStorageKey =
      typeof storageKey === 'function'
        ? storageKey(executor)
        : (storageKey ?? executor.manager.keySerializer(executor.key));

    if (typeof executorStorageKey !== 'string') {
      throw new Error('Cannot guess a storage key for an executor, the "storageKey" option is required');
    }

    let latestStateStr: string | null | undefined;

    const receiveState = (stateStr: string | null) => {
      let state: ExecutorState;

      if (executor.isPending) {
        return;
      }

      latestStateStr = stateStr;

      if (stateStr === null || (state = serializer.parse(stateStr)).settledAt < executor.settledAt) {
        storage.setItem(executorStorageKey, serializer.stringify(executor.toJSON()));
        return;
      }
      if (state.settledAt === executor.settledAt) {
        return;
      }
      if (executor instanceof ExecutorImpl) {
        executor.value = state.value;
        executor.reason = state.reason;
      }
      if (state.isFulfilled) {
        executor.resolve(state.value!, state.settledAt);
      } else if (state.settledAt !== 0) {
        executor.reject(state.reason, state.settledAt);
      } else if (executor.isSettled) {
        executor.clear();
      }
      if (state.invalidatedAt !== 0) {
        executor.invalidate(state.invalidatedAt);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === storage && event.key === executorStorageKey) {
        receiveState(event.newValue);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    receiveState(storage.getItem(executorStorageKey));

    executor.subscribe(event => {
      switch (event.type) {
        case 'cleared':
        case 'fulfilled':
        case 'rejected':
        case 'invalidated':
          const stateStr = serializer.stringify(executor.toJSON());

          if (latestStateStr !== stateStr) {
            latestStateStr = stateStr;
            storage.setItem(executorStorageKey, stateStr);
          }
          break;

        case 'detached':
          storage.removeItem(executorStorageKey);

          if (typeof window !== 'undefined') {
            window.removeEventListener('storage', handleStorage);
          }
          break;
      }
    });

    executor.publish('plugin_configured', {
      type: 'synchronizeStorage',
      options: { storageKey: executorStorageKey },
    } satisfies PluginConfiguredPayload);
  };
}

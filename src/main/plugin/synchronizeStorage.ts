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
import type { ExecutorPlugin, ExecutorState } from '../types';

/**
 * Serializes and deserializes values as a string.
 *
 * @template Value The value to serialize.
 */
export interface Serializer<Value> {
  /**
   * Serializes value as string.
   *
   * @param value The value to serialize.
   */
  stringify(value: Value): string;

  /**
   * Deserializes the stringified value.
   *
   * @param serializedValue The stringified value.
   */
  parse(serializedValue: string): Value;
}

/**
 * Persists the executor value in the synchronous storage.
 *
 * Synchronization is enabled only for activated executors. If executor is disposed, then the corresponding item is
 * removed from the storage.
 *
 * @param storage The storage where executor value is persisted, usually a `localStorage` or a `sessionStorage`.
 * @param serializer The storage record serializer.
 * @template Value The value persisted in the storage.
 */
export default function synchronizeStorage<Value = any>(
  storage: Pick<Storage, 'setItem' | 'getItem' | 'removeItem'>,
  serializer: Serializer<ExecutorState<Value>> = JSON
): ExecutorPlugin<Value> {
  return executor => {
    // The key corresponds to the executor state in the storage
    const storageKey = 'executor/' + executor.key;

    let latestSerializedState: string | undefined | null;

    const receiveExecutorState = (serializedState: string | null) => {
      let record;

      if (executor.isPending) {
        return;
      }

      latestSerializedState = serializedState;

      if (serializedState === null || (record = serializer.parse(serializedState)).timestamp < executor.timestamp) {
        storage.setItem(storageKey, serializer.stringify(executor.toJSON()));
        return;
      }
      if (record.timestamp === executor.timestamp) {
        return;
      }
      if (executor instanceof ExecutorImpl) {
        executor.value = record.value;
        executor.reason = record.reason;
      }
      if (record.isFulfilled) {
        executor.resolve(record.value!, record.timestamp);
      } else if (record.isRejected) {
        executor.reject(record.reason, record.timestamp);
      } else {
        executor.clear();
      }
      if (record.isStale) {
        executor.invalidate();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === storage && event.key === storageKey) {
        receiveExecutorState(event.newValue);
      }
    };

    receiveExecutorState(storage.getItem(storageKey));

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
          if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorage);
          }
          receiveExecutorState(storage.getItem(storageKey));
          break;

        case 'cleared':
        case 'fulfilled':
        case 'rejected':
        case 'invalidated':
          if (!executor.isActive) {
            break;
          }
          const serializedState = serializer.stringify(executor.toJSON());

          if (latestSerializedState !== serializedState) {
            storage.setItem(storageKey, serializedState);
          }
          break;

        case 'deactivated':
          if (typeof window !== 'undefined') {
            window.removeEventListener('storage', handleStorage);
          }
          break;

        case 'disposed':
          storage.removeItem(storageKey);
          break;
      }
    });
  };
}

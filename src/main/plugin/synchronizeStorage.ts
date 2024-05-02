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

    let latestStateStr: string | null | undefined;

    const receiveState = (stateStr: string | null) => {
      let state;

      if (executor.isPending) {
        return;
      }

      latestStateStr = stateStr;

      if (stateStr === null || (state = serializer.parse(stateStr)).timestamp < executor.timestamp) {
        storage.setItem(storageKey, serializer.stringify(executor.toJSON()));
        return;
      }
      if (state.timestamp === executor.timestamp) {
        return;
      }
      if (executor instanceof ExecutorImpl) {
        executor.value = state.value;
        executor.reason = state.reason;
      }
      if (state.isFulfilled) {
        executor.resolve(state.value!, state.timestamp);
      } else if (state.isRejected) {
        executor.reject(state.reason, state.timestamp);
      } else {
        executor.clear();
      }
      if (state.isStale) {
        executor.invalidate();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === storage && event.key === storageKey) {
        receiveState(event.newValue);
      }
    };

    receiveState(storage.getItem(storageKey));

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
          if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorage);
          }
          receiveState(storage.getItem(storageKey));
          break;

        case 'cleared':
        case 'fulfilled':
        case 'rejected':
        case 'invalidated':
          if (!executor.isActive) {
            break;
          }
          const stateStr = serializer.stringify(executor.toJSON());

          if (latestStateStr !== stateStr) {
            storage.setItem(storageKey, stateStr);
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

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

import type { Executor, ExecutorPlugin, ExecutorState, PluginConfiguredPayload } from '../types.js';
import { emptyObject, isObjectLike, isShallowEqual } from '../utils.js';

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
   * By default, a {@link ExecutorManagerOptions.keySerializer serialized} {@link Executor.key} is used as a storage key.
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
      storageKey === undefined
        ? executor.manager.keySerializer(executor.key)
        : typeof storageKey === 'function'
          ? storageKey(executor)
          : storageKey;

    if (typeof executorStorageKey !== 'string') {
      throw new Error('Cannot guess a storage key for an executor, the "storageKey" option is required');
    }

    const flushState = () => storage.setItem(executorStorageKey, serializer.stringify(executor.toJSON()));

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === storage && event.key === executorStorageKey) {
        receiveState(executor, flushState, event.newValue, serializer);
      }
    };

    receiveState(executor, flushState, storage.getItem(executorStorageKey), serializer);

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'cleared':
        case 'fulfilled':
        case 'rejected':
        case 'invalidated':
        case 'annotated':
          flushState();
          break;

        case 'aborted':
          receiveState(executor, flushState, storage.getItem(executorStorageKey), serializer);
          break;

        case 'detached':
          storage.removeItem(executorStorageKey);

          if (typeof window !== 'undefined') {
            window.removeEventListener('storage', handleStorage);
          }
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: {
        type: 'synchronizeStorage',
        options: { storageKey: executorStorageKey },
      } satisfies PluginConfiguredPayload,
    });
  };
}

function receiveState(
  executor: { -readonly [K in keyof Executor]: Executor[K] },
  flushState: () => void,
  stateStr: string | null,
  serializer: Serializer<ExecutorState>
): void {
  if (executor.isPending) {
    // The executor would overwrite storage item when settled
    return;
  }

  if (stateStr === null) {
    // No storage item
    flushState();
    return;
  }

  const actualState = executor.toJSON();

  if (stateStr === serializer.stringify(actualState)) {
    // No changes
    return;
  }

  let storedState: ExecutorState | undefined;

  try {
    storedState = serializer.parse(stateStr);
  } catch (error) {
    // Cannot parse storage item
    setTimeout(() => {
      // Force uncaught exception
      throw error;
    }, 0);
  }

  if (
    // Check the stored state is malformed
    !isObjectLike(storedState) ||
    !isObjectLike(storedState.annotations) ||
    typeof storedState.settledAt !== 'number' ||
    typeof storedState.invalidatedAt !== 'number' ||
    typeof storedState.isFulfilled !== 'boolean' ||
    // Check the stored state is outdated
    (storedState.settledAt !== 0 && storedState.settledAt < actualState.settledAt)
  ) {
    // Overwrite storage item with the actual state
    flushState();
    return;
  }

  // Update the executor with the stored state
  executor.value = storedState.value;
  executor.reason = storedState.reason;
  executor.annotations = storedState.annotations;
  executor.settledAt = storedState.settledAt;
  executor.invalidatedAt = storedState.invalidatedAt;
  executor.isFulfilled = storedState.isFulfilled;
  executor.version++;

  if (!isShallowEqual(storedState.annotations, actualState.annotations)) {
    executor.publish({ type: 'annotated' });
  }

  if (storedState.isFulfilled) {
    executor.publish({ type: 'fulfilled' });
  } else if (storedState.settledAt !== 0) {
    executor.publish({ type: 'rejected' });
  } else if (actualState.settledAt !== 0) {
    executor.publish({ type: 'cleared' });
  }

  if (storedState.invalidatedAt !== 0 && actualState.invalidatedAt === 0) {
    executor.publish({ type: 'invalidated' });
  }
}

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
    // The executor would overwrite storage item after the settlement
    return;
  }

  if (stateStr === null) {
    // No storage item
    flushState();
    return;
  }

  let nextState: ExecutorState | undefined;

  try {
    nextState = serializer.parse(stateStr);
  } catch (error) {
    // Cannot parse storage item
    setTimeout(() => {
      // Force uncaught exception
      throw error;
    }, 0);
  }

  if (
    !isObjectLike(nextState) ||
    !isObjectLike(nextState.annotations) ||
    typeof nextState.settledAt !== 'number' ||
    typeof nextState.invalidatedAt !== 'number' ||
    typeof nextState.isFulfilled !== 'boolean' ||
    (nextState.settledAt !== 0 && nextState.settledAt < executor.settledAt)
  ) {
    // Invalid or outdated storage item
    flushState();
    return;
  }

  const prevState = executor.toJSON();

  // Update the executor state before events are published
  executor.version++;
  executor.value = nextState.value;
  executor.reason = nextState.reason;
  executor.annotations = nextState.annotations;
  executor.settledAt = nextState.settledAt;
  executor.invalidatedAt = nextState.invalidatedAt;
  executor.isFulfilled = nextState.isFulfilled;

  if (!isShallowEqual(nextState.annotations, prevState.annotations)) {
    executor.publish({ type: 'annotated' });
  }

  if (nextState.isFulfilled) {
    executor.publish({ type: 'fulfilled' });
  } else if (nextState.settledAt !== 0) {
    executor.publish({ type: 'rejected' });
  } else if (prevState.settledAt !== 0) {
    executor.publish({ type: 'cleared' });
  }

  if (nextState.invalidatedAt !== 0 && prevState.invalidatedAt === 0) {
    executor.publish({ type: 'invalidated' });
  }
}

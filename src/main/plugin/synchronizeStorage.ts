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
import { emptyObject, isObjectLike, isShallowEqual, throwUnhandled } from '../utils.js';
import type { ExecutorImpl } from '../ExecutorImpl.js';

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
   * By default, a {@link react-executor!ExecutorManagerOptions.keySerializer serialized} {@link Executor.key} is used
   * as a storage key.
   */
  storageKey?: string | ((executor: Executor) => string);
}

/**
 * Persists the executor value in the synchronous storage.
 *
 * If executor is detached, then the corresponding item is removed from the storage.
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
    const keyStr =
      storageKey === undefined
        ? executor.manager.keySerializer(executor.key)
        : typeof storageKey === 'function'
          ? storageKey(executor)
          : storageKey;

    if (typeof keyStr !== 'string') {
      throw new Error('Cannot guess a storage key for an executor, the "storageKey" option is required');
    }

    const saveState = () => storage.setItem(keyStr, serializer.stringify(executor.toJSON()));

    const readState = () => setExecutorState(executor as ExecutorImpl, saveState, storage.getItem(keyStr), serializer);

    const dropState = () => storage.removeItem(keyStr);

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === storage && (event.key === null || event.key === keyStr)) {
        readState();
      }
    };

    readState();

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
          saveState();
          break;

        case 'aborted':
          readState();
          break;

        case 'detached':
          dropState();

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
        options: { storageKey: keyStr },
      } satisfies PluginConfiguredPayload,
    });
  };
}

function setExecutorState(
  executor: ExecutorImpl,
  saveState: () => void,
  stateStr: string | null,
  serializer: Serializer<ExecutorState>
): void {
  if (executor.isPending) {
    // The executor would overwrite storage item when settled
    return;
  }

  if (stateStr === null) {
    // No storage item
    saveState();
    return;
  }

  const prevState = executor.toJSON();

  if (stateStr === serializer.stringify(prevState)) {
    // No changes
    return;
  }

  let nextState: ExecutorState | undefined;

  try {
    nextState = serializer.parse(stateStr);
  } catch (error) {
    throwUnhandled(error);
  }

  if (!isExecutorState(nextState) || (nextState.settledAt !== 0 && nextState.settledAt < prevState.settledAt)) {
    // Stored state is malformed or outdated
    saveState();
    return;
  }

  // Update the executor with the stored state
  executor.value = nextState.value;
  executor.reason = nextState.reason;
  executor.annotations = nextState.annotations;
  executor.settledAt = nextState.settledAt;
  executor.invalidatedAt = nextState.invalidatedAt;
  executor.isFulfilled = nextState.isFulfilled;
  executor.version++;

  if (!isShallowEqual(nextState.annotations, prevState.annotations)) {
    // Annotations have changed
    executor.publish({ type: 'annotated' });
  }

  if (nextState.settledAt !== prevState.settledAt) {
    // The executor was resolved, rejected or cleared

    if (nextState.isFulfilled) {
      executor.publish({ type: 'fulfilled' });
    } else if (nextState.settledAt !== 0) {
      executor.publish({ type: 'rejected' });
    } else if (prevState.settledAt !== 0) {
      executor.publish({ type: 'cleared' });
    }
  }

  if (nextState.invalidatedAt !== 0 && prevState.invalidatedAt === 0) {
    // The executor was invalidated
    executor.publish({ type: 'invalidated' });
  }
}

function isExecutorState(state: ExecutorState | null | undefined): state is ExecutorState {
  return (
    isObjectLike(state) &&
    isObjectLike(state.annotations) &&
    typeof state.settledAt === 'number' &&
    typeof state.invalidatedAt === 'number' &&
    typeof state.isFulfilled === 'boolean'
  );
}

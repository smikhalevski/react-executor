import type { ExecutorPlugin } from '../types';

/**
 * Serializes and deserializes values as a string.
 *
 * @template Value The value to serialize.
 */
export interface Serializer<Value> {
  serialize(record: Value): string;

  deserialize(str: string): Value;
}

/**
 * The record persisted in {@link Storage}.
 */
export interface StorageRecord<Value> {
  /**
   * The executor value.
   */
  value: Value;

  /**
   * The timestamp when the {@link value} was acquired.
   */
  timestamp: number;
}

export interface Storage {
  getItem(key: string): string | null;

  removeItem(key: string): void;

  setItem(key: string, value: string): void;
}

/**
 * Persists the executor value in the synchronous storage.
 *
 * @param storage The storage where executor value is persisted.
 * @param serializer The storage record serializer.
 * @template Value The value persisted in the storage.
 */
export default function syncStorage<Value = any>(
  storage: Storage,
  serializer: Serializer<StorageRecord<Value>> = naturalSerializer
): ExecutorPlugin<Value> {
  return executor => {
    if (executor.isSettled || executor.isPending) {
      if (executor.isFulfilled) {
        // Synchronize storage
        storage.setItem(executor.key, serializer.serialize({ value: executor.get(), timestamp: executor.timestamp }));
      }
    } else {
      const str = storage.getItem(executor.key);

      if (str !== null) {
        const record = serializer.deserialize(str);

        executor.resolve(record.value, record.timestamp);
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== storage && event.key === executor.key) {
        // Unrelated storage or key
        return;
      }

      const str = event.newValue;

      if (str === null) {
        executor.clear();
        return;
      }

      const record = serializer.deserialize(str);

      if (record.timestamp > executor.timestamp) {
        executor.resolve(record.value, record.timestamp);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'fulfilled':
        case 'cleared':
          if (executor.value === undefined) {
            storage.removeItem(executor.key);
            break;
          }
          storage.setItem(executor.key, serializer.serialize({ value: executor.value, timestamp: executor.timestamp }));
          break;

        case 'disposed':
          if (typeof window !== 'undefined') {
            window.removeEventListener('storage', handleStorage);
          }
          break;
      }
    });
  };
}

const naturalSerializer: Serializer<any> = {
  serialize: value => JSON.stringify(value),
  deserialize: str => JSON.parse(str),
};

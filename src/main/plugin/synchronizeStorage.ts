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
   * The executor value, or `undefined` if the executor was cleared.
   */
  value: Value | undefined;

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
 * Synchronization is enabled only for activated executors. If executor is disposed, corresponding item is removed from
 * the storage.
 *
 * @param storage The storage where executor value is persisted.
 * @param serializer The storage record serializer.
 * @template Value The value persisted in the storage.
 */
export default function synchronizeStorage<Value = any>(
  storage: Storage,
  serializer: Serializer<StorageRecord<Value>> = naturalSerializer
): ExecutorPlugin<Value> {
  return executor => {
    const storageKey = 'executor/' + executor.key;

    let latestStr: string | undefined | null;

    const receiveStr = (str: string | null) => {
      let record;

      latestStr = str;

      if (str === null || (record = serializer.deserialize(str)).timestamp < executor.timestamp) {
        storage.setItem(storageKey, serializer.serialize({ value: executor.value, timestamp: executor.timestamp }));
        return;
      }
      if (record.timestamp === executor.timestamp) {
        return;
      }
      if (record.value === undefined) {
        executor.clear();
      } else {
        executor.resolve(record.value, record.timestamp);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (!executor.isPending && event.storageArea === storage && event.key === storageKey) {
        receiveStr(event.newValue);
      }
    };

    executor.subscribe(event => {
      switch (event.type) {
        case 'activated':
          if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorage);
          }
          if (!executor.isPending) {
            receiveStr(storage.getItem(storageKey));
          }
          break;

        case 'cleared':
        case 'fulfilled':
          if (!executor.isActive) {
            break;
          }
          const str = serializer.serialize({ value: executor.value, timestamp: executor.timestamp });

          if (latestStr !== str) {
            storage.setItem(storageKey, str);
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

const naturalSerializer: Serializer<any> = {
  serialize: value => JSON.stringify(value),
  deserialize: str => JSON.parse(str),
};

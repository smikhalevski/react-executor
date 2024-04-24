import type { ExecutorPlugin } from '../types';

export interface Serializer<Value> {
  serialize(value: Value): string;

  deserialize(str: string): Value;
}

/**
 * Persists the executor value in the synchronous storage.
 *
 * @param storage The storage where executor value is persisted.
 * @param serializer The value serializer.
 */
export default function syncStorage<Value = any>(
  storage: Storage,
  serializer: Serializer<Value> = naturalSerializer
): ExecutorPlugin<Value> {
  return executor => {
    if (executor.isSettled || executor.isPending) {
      if (executor.isFulfilled) {
        // Synchronize storage
        storage.setItem(executor.key, serializer.serialize(executor.get()));
      }
    } else {
      const str = storage.getItem(executor.key);

      if (str !== null) {
        executor.resolve(serializer.deserialize(str));
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== storage) {
        // Unrelated storage
        return;
      }

      const str = storage.getItem(executor.key);

      if (str === null) {
        executor.clear();
      } else if (executor.value === undefined || serializer.serialize(executor.value) !== str) {
        executor.resolve(serializer.deserialize(str));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    executor.subscribe(event => {
      switch (event.type) {
        case 'fulfilled':
        case 'rejected':
        case 'cleared':
          if (executor.value === undefined) {
            storage.removeItem(executor.key);
          } else {
            storage.setItem(executor.key, serializer.serialize(executor.value));
          }
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

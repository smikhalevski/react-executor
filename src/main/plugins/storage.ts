import type { Plugin } from '../types';

export interface Serializer<Value> {
  serialize(value: Value): string;

  deserialize(str: string): Value;
}

export default function storagePlugin<Value = any>(
  storage: Storage,
  serializer: Serializer<Value> = jsonSerializer
): Plugin<Value> {
  return executor => {
    const str = storage.getItem(executor.key);

    if (str !== null) {
      executor.resolve(serializer.deserialize(str));
    }

    const unsubscribe = executor.subscribe(event => {
      if (event.type === 'fulfilled' || event.type === 'rejected' || event.type === 'cleared') {
        if (executor.value === undefined) {
          storage.removeItem(executor.key);
        } else {
          storage.setItem(executor.key, serializer.serialize(executor.value));
        }
      }
    });

    if (typeof window === 'undefined') {
      return unsubscribe;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== storage) {
        return;
      }

      const str = storage.getItem(executor.key);

      if (str === null) {
        executor.clear();
      } else if (executor.value === undefined || serializer.serialize(executor.value) !== str) {
        executor.resolve(serializer.deserialize(str));
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubscribe();
    };
  };
}

const jsonSerializer: Serializer<any> = {
  serialize: value => JSON.stringify(value),
  deserialize: str => JSON.parse(str),
};

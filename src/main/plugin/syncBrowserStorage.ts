/**
 * The plugin that synchronizes the executor state with a browser storage item.
 *
 * ```ts
 * import syncBrowserStorage from 'react-executor/plugin/syncBrowserStorage';
 *
 * const executor = useExecutor('test', 42, [syncBrowserStorage()]);
 * ```
 *
 * @module plugin/syncBrowserStorage
 */

import type { Executor, ExecutorPlugin, ExecutorState, Serializer } from '../types.js';
import { emptyObject } from '../utils.js';
import syncExternalStore, { ExternalStore } from './syncExternalStore.js';
import { PubSub } from 'parallel-universe';

/**
 * Options of the {@link syncBrowserStorage} plugin.
 */
export interface SyncBrowserStorageOptions {
  /**
   * The storage where executor state is persisted.
   *
   * @default "local"
   */
  storageType?: 'local' | 'session';

  /**
   * A storage item key, or a callback that returns a storage item key.
   *
   * By default, an {@link react-executor!ExecutorManagerOptions.keyIdGenerator executor key ID} is used.
   */
  storageKey?: string | ((executor: Executor) => string);

  /**
   * The storage item value serializer.
   *
   * @default JSON
   */
  serializer?: Serializer;
}

/**
 * Synchronizes the executor state with a browser storage item. No-op in a non-browser environment.
 *
 * If an executor is detached, then the corresponding item is removed from the storage.
 *
 * @param options Storage options.
 */
export default function syncBrowserStorage(options: SyncBrowserStorageOptions = emptyObject): ExecutorPlugin {
  const { storageType = 'local', storageKey, serializer = JSON } = options;

  return executor => {
    const key =
      storageKey === undefined
        ? executor.manager.keyIdGenerator(executor.key)
        : typeof storageKey === 'function'
          ? storageKey(executor)
          : storageKey;

    if (typeof key !== 'string') {
      throw new Error('Cannot guess a storage key for an executor, the "storageKey" option is required');
    }

    if (typeof window !== 'undefined') {
      syncExternalStore(new BrowserStore(storageType, key, serializer))(executor);
    }
  };
}

const pubSub = new PubSub<StorageEvent>();

function handleStorage(event: StorageEvent): void {
  pubSub.publish(event);
}

class BrowserStore implements ExternalStore<ExecutorState> {
  readonly storageArea;

  constructor(
    readonly storageType: 'local' | 'session',
    readonly key: string,
    readonly serializer: Serializer
  ) {
    this.storageArea = this.storageType === 'session' ? sessionStorage : localStorage;
  }

  get(): ExecutorState | null {
    const storedValue = this.storageArea.getItem(this.key);

    if (storedValue === null) {
      return null;
    }

    try {
      return this.serializer.parse(storedValue);
    } catch (error) {
      setTimeout(() => {
        // Throw unhandled error
        throw error;
      }, 0);
      return null;
    }
  }

  set(state: ExecutorState): void {
    this.storageArea.setItem(this.key, this.serializer.stringify(state));
  }

  delete(): void {
    this.storageArea.removeItem(this.key);
  }

  subscribe(listener: (state: ExecutorState | null) => void): () => void {
    if (pubSub.listenerCount === 0) {
      window.addEventListener('storage', handleStorage);
    }

    const unsubscribe = pubSub.subscribe(event => {
      if (event.storageArea === this.storageArea && event.key === this.key) {
        listener(this.get());
      }
    });

    return () => {
      unsubscribe();

      if (pubSub.listenerCount === 0) {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }
}

import { Executor } from './types';
import { ExecutorImpl } from './ExecutorImpl';
import { noop } from './utils';

export class ExecutorManager {
  private _executorRefs = new Map<unknown, { executor: ExecutorImpl; refCount: number }>();

  /**
   * Returns an executor by its key, or `undefined` if there's no such executor.
   */
  get(key: string): Executor | undefined {
    return this._executorRefs.get(key)?.executor;
  }

  /**
   * Returns an existing shared executor or creates a new one.
   */
  getOrCreate(key: string): Executor {
    let ref = this._executorRefs.get(key);

    if (ref === undefined) {
      ref = { executor: new ExecutorImpl(key), refCount: 0 };
      this._executorRefs.set(key, ref);
    }

    return ref.executor;
  }

  connect(key: unknown): () => void {
    const ref = this._executorRefs.get(key);

    if (ref === undefined) {
      return noop;
    }

    let isConnected = true;

    ref.refCount++;

    return () => {
      if (isConnected) {
        isConnected = false;

        setTimeout(() => {
          if (--ref.refCount === 0) {
            ref.executor.abort();
          }
        }, 0);
      }
    };
  }
}

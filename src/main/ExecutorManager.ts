import { Executor } from './Executor';
import { ExecutorImpl } from './ExecutorImpl';
import { noop } from './utils';

export class ExecutorManager {
  private _refs = new Map<unknown, { executor: Executor; observerCount: number }>();

  /**
   * Returns a shared executor by its key.
   */
  get(key: unknown): Executor | undefined {
    return this._refs.get(key)?.executor;
  }

  /**
   * Returns an existing shared executor or creates a new one.
   */
  getOrCreate(key: unknown): Executor {
    let ref = this._refs.get(key);

    if (ref === undefined) {
      ref = { executor: new ExecutorImpl(), observerCount: 0 };
      this._refs.set(key, ref);
    }

    return ref.executor;
  }

  observe(key: unknown): () => void {
    const ref = this._refs.get(key);

    if (ref === undefined) {
      return noop;
    }

    let isObserved = true;

    ref.observerCount++;

    return () => {
      if (!isObserved) {
        return;
      }

      isObserved = false;

      setTimeout(() => {
        if (--ref.observerCount === 0) {
          ref.executor.abort();
        }
      }, 0);
    };
  }
}

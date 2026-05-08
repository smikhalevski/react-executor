import { AbortablePromise, PubSub } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager.js';
import {
  Executor,
  ExecutorEvent,
  ExecutorState,
  ExecutorTask,
  ExecutorTaskCallback,
  PartialExecutorEvent,
} from './types.js';
import { AbortError, isPromiseLike, preventUnhandledRejection } from './utils.js';

/**
 * The {@link Executor} implementation returned by the {@link ExecutorManager}.
 *
 * @internal
 */
export class ExecutorImpl<Value = any> implements Executor {
  value: Value | undefined = undefined;
  reason: any = undefined;
  task: ExecutorTask<Value> | null = null;
  settledAt = 0;
  invalidatedAt = 0;
  isFulfilled = false;
  annotations: Record<PropertyKey, any> = {};
  version = 0;
  promise: AbortablePromise<Value> | null = null;

  /**
   * The number of times the executor was activated.
   */
  _activationCount = 0;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  _pubSub = new PubSub<ExecutorEvent>();

  /**
   * Snapshot captured before optimistic task execution.
   */
  _rollbackSnapshot: ExecutorState<Value> | null = null;

  get isRejected(): boolean {
    return this.isSettled && !this.isFulfilled;
  }

  get isSettled(): boolean {
    return this.settledAt !== 0;
  }

  get isActive(): boolean {
    return this._activationCount !== 0;
  }

  get isPending(): boolean {
    return this.promise !== null;
  }

  get isInvalidated(): boolean {
    return this.invalidatedAt !== 0;
  }

  constructor(
    readonly key: unknown,
    readonly manager: ExecutorManager
  ) {}

  get = (): Value => {
    if (this.isFulfilled) {
      return this.value!;
    }
    throw this.isSettled ? this.reason : new Error('The executor is not settled');
  };

  getOrDefault = <DefaultValue>(defaultValue?: DefaultValue): Value | DefaultValue | undefined => {
    return this.isFulfilled ? this.value : defaultValue;
  };

  getOrAwait = (): AbortablePromise<Value> => {
    return new AbortablePromise((resolve, reject, signal) => {
      if (this.isSettled && !this.isPending) {
        if (this.isFulfilled) {
          resolve(this.value!);
        } else {
          reject(this.reason);
        }
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'detached') {
          unsubscribe();
          reject(AbortError('The executor was detached'));
          return;
        }

        if (this.isSettled && !this.isPending) {
          unsubscribe();

          if (this.isFulfilled) {
            resolve(this.value!);
          } else {
            reject(this.reason);
          }
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  };

  execute = (task: ExecutorTask<Value> | ExecutorTaskCallback<Value>): AbortablePromise<Value> => {
    if (typeof task === 'function') {
      task = { callback: task };
    }

    const { callback, placeholderValue, noTaskReplace } = task;

    const handleAbort = () => {
      if (this.promise === promise) {
        this._rollback();
        this.promise = null;
        this.version++;
      }

      this.publish({ type: 'aborted' });
    };

    // Rollback pending execution
    this._rollback();

    const promise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', handleAbort);

      new Promise<Value>(resolve => {
        const value = callback(signal, this);
        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          signal.removeEventListener('abort', handleAbort);

          if (signal.aborted) {
            return;
          }
          this.promise = null;
          this.resolve(value);
          resolve(value);
        },

        error => {
          signal.removeEventListener('abort', handleAbort);

          if (signal.aborted) {
            return;
          }
          this.promise = null;
          this.reject(error);
          reject(error);
        }
      );
    });

    preventUnhandledRejection(promise);

    const prevPromise = this.promise;
    this.promise = promise;

    if (prevPromise !== null) {
      prevPromise.abort(AbortError('The task was replaced'));
    } else {
      this.version++;
    }

    if (this.promise !== promise) {
      // Task was replaced midflight
      return promise;
    }

    if (!noTaskReplace) {
      this.task = task;
    }

    if (placeholderValue !== undefined) {
      this._rollbackSnapshot = this.getStateSnapshot();
      this.isFulfilled = true;
      this.value = placeholderValue;
      this.settledAt = Date.now();
      this.invalidatedAt = 0;
    }

    this.publish({ type: 'pending' });

    return promise;
  };

  retry = (): void => {
    if (this.task !== null && !this.isPending) {
      this.execute(this.task);
    }
  };

  clear = (): void => {
    if (this.isSettled) {
      this.isFulfilled = false;
      this.value = this.reason = undefined;
      this.settledAt = this.invalidatedAt = 0;
      this.version++;
      this.publish({ type: 'cleared' });
    }
  };

  abort = (reason: unknown = AbortError('The executor was aborted')): void => {
    this.promise?.abort(reason);
  };

  invalidate = (invalidatedAt = Date.now()): void => {
    if (!this.isInvalidated && this.isSettled) {
      this.invalidatedAt = invalidatedAt;
      this.version++;
      this.publish({ type: 'invalidated' });
    }
  };

  resolve = (value: PromiseLike<Value> | Value, settledAt = Date.now()): void => {
    if (isPromiseLike(value)) {
      this.execute({ callback: () => value, noTaskReplace: true });
      return;
    }

    this._rollback();

    const prevPromise = this.promise;
    this.promise = null;

    prevPromise?.abort();

    this.isFulfilled = true;
    this.value = value;
    this.settledAt = settledAt;
    this.invalidatedAt = 0;

    this.version++;
    this.publish({ type: 'fulfilled' });
  };

  reject = (reason: any, settledAt = Date.now()): void => {
    this._rollback();

    const prevPromise = this.promise;
    this.promise = null;

    prevPromise?.abort();

    this.isFulfilled = false;
    this.reason = reason;
    this.settledAt = settledAt;
    this.invalidatedAt = 0;

    this.version++;
    this.publish({ type: 'rejected' });
  };

  activate = (): (() => void) => {
    let isActive = true;

    if (this._activationCount++ === 0) {
      this.publish({ type: 'activated' });
    }

    return () => {
      if (isActive && ((isActive = false), --this._activationCount === 0)) {
        this.publish({ type: 'deactivated' });
      }
    };
  };

  subscribe = (listener: (event: ExecutorEvent<Value>) => void): (() => void) => {
    return this._pubSub.subscribe(listener);
  };

  publish = (event: PartialExecutorEvent): void => {
    this._pubSub.publish({
      type: event.type,
      target: this,
      version: this.version,
      payload: event.payload,
    });
  };

  annotate = (patch: Record<PropertyKey, any>): void => {
    this.version++;
    Object.assign(this.annotations, patch);
    this.publish({ type: 'annotated' });
  };

  getStateSnapshot = (): ExecutorState<Value> => {
    return {
      isFulfilled: this.isFulfilled,
      value: this.value,
      reason: this.reason,
      annotations: this.annotations,
      settledAt: this.settledAt,
      invalidatedAt: this.invalidatedAt,
    };
  };

  _rollback(): void {
    if (this._rollbackSnapshot !== null) {
      Object.assign(this, this._rollbackSnapshot);
      this._rollbackSnapshot = null;
    }
  }
}

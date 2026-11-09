import type { ExecutorManager } from './ExecutorManager.ts';
import { PubSub } from './PubSub.ts';
import type {
  AbortableOptions,
  Executor,
  ExecutorEvent,
  ExecutorState,
  ExecutorTask,
  ExecutorTaskCallback,
  PartialExecutorEvent,
} from './types.ts';
import { AbortError, isPromiseLike, preventUnhandledRejection } from './utils.ts';

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
  promise: Promise<Value> | null = null;

  /**
   * The controller that aborts the pending task, or `null` if there's no pending task.
   */
  _abortController: AbortController | null = null;

  /**
   * The number of times the executor was activated.
   */
  _activationCount = 0;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  _pubSub = new PubSub<ExecutorEvent>();

  /**
   * Snapshot captured before task execution, if the execution can be rolled back.
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

  getOrAwait = (options: AbortableOptions = {}): Promise<Value> => {
    const { signal } = options;

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }

      if (this.isSettled && !this.isPending) {
        if (this.isFulfilled) {
          resolve(this.value!);
        } else {
          reject(this.reason);
        }
        return;
      }

      const handleAbort = () => {
        unsubscribe();
        reject(signal!.reason);
      };

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'detached') {
          unsubscribe();
          signal?.removeEventListener('abort', handleAbort);
          reject(AbortError('The executor was detached'));
          return;
        }

        if (this.isSettled && !this.isPending) {
          unsubscribe();
          signal?.removeEventListener('abort', handleAbort);

          if (this.isFulfilled) {
            resolve(this.value!);
          } else {
            reject(this.reason);
          }
        }
      });

      signal?.addEventListener('abort', handleAbort);
    });
  };

  execute = (
    task: ExecutorTask<Value> | ExecutorTaskCallback<Value>,
    options: AbortableOptions = {}
  ): Promise<Value> => {
    const { signal } = options;

    if (signal?.aborted) {
      return preventUnhandledRejection(Promise.reject(signal.reason));
    }

    if (typeof task === 'function') {
      task = { callback: task };
    }

    const { callback, pendingValue, preserveLatestTask } = task;

    const abortController = new AbortController();
    const taskSignal = abortController.signal;

    const handleAbort = () => {
      abortController.abort(signal!.reason);
    };

    // Rollback pending execution if any
    this._rollback();

    const promise = new Promise<Value>((resolve, reject) => {
      taskSignal.addEventListener('abort', () => {
        signal?.removeEventListener('abort', handleAbort);

        reject(taskSignal.reason);

        if (this._abortController === abortController) {
          this._rollback();
          this._abortController = null;
          this.promise = null;
          this.version++;
        }

        this.publish({ type: 'aborted' });
      });

      new Promise<Value>(resolve => {
        resolve(callback(taskSignal, this));
      }).then(
        value => {
          signal?.removeEventListener('abort', handleAbort);

          if (taskSignal.aborted) {
            return;
          }
          this._abortController = null;
          this.promise = null;
          this.resolve(value);
          resolve(value);
        },

        error => {
          signal?.removeEventListener('abort', handleAbort);

          if (taskSignal.aborted) {
            return;
          }
          this._abortController = null;
          this.promise = null;
          this.reject(error);
          reject(error);
        }
      );
    });

    preventUnhandledRejection(promise);

    const prevAbortController = this._abortController;

    this._abortController = abortController;
    this.promise = promise;

    if (prevAbortController !== null) {
      prevAbortController.abort(AbortError('The task was replaced'));
    }

    if (this._abortController !== abortController) {
      // Task was replaced midflight
      return promise;
    }

    // Replacing a task can roll back or apply a pending value, so the version is bumped even if a task was pending
    this.version++;

    if (!preserveLatestTask) {
      this.task = task;
    }

    if (pendingValue !== undefined) {
      this._rollbackSnapshot = this.getStateSnapshot();
      this.isFulfilled = true;
      this.value = pendingValue;
      this.settledAt = Date.now();
      this.invalidatedAt = 0;
    }

    signal?.addEventListener('abort', handleAbort);

    this.publish({ type: 'pending', payload: { task } });

    if (signal?.aborted) {
      // The signal was aborted while the task was being started, before the abort listener was added
      handleAbort();
    }

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
    this._abortController?.abort(reason);
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
      this.execute({ callback: () => value, preserveLatestTask: true });
      return;
    }

    this._rollback();

    const prevAbortController = this._abortController;

    this._abortController = null;
    this.promise = null;

    prevAbortController?.abort();

    this.isFulfilled = true;
    this.value = value;
    this.settledAt = settledAt;
    this.invalidatedAt = 0;

    this.version++;
    this.publish({ type: 'fulfilled' });
  };

  reject = (reason: any, settledAt = Date.now()): void => {
    this._rollback();

    const prevAbortController = this._abortController;

    this._abortController = null;
    this.promise = null;

    prevAbortController?.abort();

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
      if (!isActive) {
        return;
      }

      isActive = false;

      if (--this._activationCount === 0) {
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

import { AbortablePromise, PubSub } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';
import type { Executor, ExecutorEvent, ExecutorState, ExecutorTask } from './types';
import { AbortError, definePrivateProperty } from './utils';

/**
 * The {@link Executor} implementation returned by the {@link ExecutorManager}.
 *
 * @internal
 */
export class ExecutorImpl<Value = any> implements Executor {
  isFulfilled = false;
  isRejected = false;
  isStale = false;
  value: Value | undefined = undefined;
  reason: any = undefined;
  latestTask: ExecutorTask<Value> | null = null;
  timestamp = 0;
  version = 0;

  /**
   * The promise of the pending task execution, or `null` if there's no pending task execution.
   */
  declare _promise: AbortablePromise<Value> | null;

  /**
   * The number times the executor was activated.
   */
  declare _activeCount: number;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  declare _pubSub: PubSub<ExecutorEvent>;

  get isSettled(): boolean {
    return this.isFulfilled || this.isRejected;
  }

  get isActive(): boolean {
    return this._activeCount !== 0;
  }

  get isPending(): boolean {
    return this._promise !== null;
  }

  constructor(
    public readonly key: string,
    public readonly manager: ExecutorManager
  ) {
    definePrivateProperty(this, '_promise', null);
    definePrivateProperty(this, '_activeCount', 0);
    definePrivateProperty(this, '_pubSub', new PubSub());
  }

  get(): Value {
    if (this.isFulfilled) {
      return this.value!;
    }
    if (this.isRejected) {
      throw this.reason;
    }
    throw new Error('The executor is not settled');
  }

  getOrDefault(defaultValue: Value): Value {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  toPromise(): AbortablePromise<Value> {
    return new AbortablePromise((resolve, reject, signal) => {
      if (this.isSettled && !this.isPending) {
        resolve(this.get());
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'disposed') {
          unsubscribe();
          reject(AbortError('The executor was disposed: ' + this.key));
          return;
        }

        if (this.isSettled && !this.isPending) {
          unsubscribe();
          try {
            resolve(this.get());
          } catch (error) {
            reject(error);
          }
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  }

  execute(task: ExecutorTask<Value>): AbortablePromise<Value> {
    const promise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this._promise === promise) {
          this._promise = null;
        }
        notify(this, 'aborted');
      });

      new Promise<Value>(resolve => {
        const value = task(signal, this);
        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (signal.aborted) {
            return;
          }
          this._promise = null;
          this.resolve(value);
          resolve(value);
        },

        reason => {
          if (signal.aborted) {
            return;
          }
          this._promise = null;
          this.reject(reason);
          reject(reason);
        }
      );
    });

    const prevPromise = this._promise;
    this._promise = promise;

    if (prevPromise !== null) {
      prevPromise.abort(AbortError('The task was replaced: ' + this.key));
    }

    if (this._promise === promise) {
      this.latestTask = task;
      notify(this, 'pending');
    }

    return promise;
  }

  retry(): void {
    if (this.latestTask !== null && !this.isPending) {
      this.execute(this.latestTask);
    }
  }

  clear(): void {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = this.isStale = false;
      this.value = this.reason = undefined;
      this.timestamp = 0;
      notify(this, 'cleared');
    }
  }

  abort(reason: unknown = AbortError('The executor was aborted: ' + this.key)): void {
    if (this._promise !== null) {
      this._promise.abort(reason);
    }
  }

  invalidate(): void {
    if (this.isStale !== (this.isStale = this.isSettled)) {
      notify(this, 'invalidated');
    }
  }

  resolve(value: PromiseLike<Value> | Value, timestamp = Date.now()): void {
    if (value !== null && typeof value === 'object' && 'then' in value) {
      this.execute(() => value);
      return;
    }

    const promise = this._promise;
    this._promise = null;

    if (promise !== null) {
      promise.abort();
    }

    this.isFulfilled = true;
    this.isRejected = this.isStale = false;
    this.value = value;
    this.timestamp = timestamp;

    notify(this, 'fulfilled');
  }

  reject(reason: any, timestamp = Date.now()): void {
    const promise = this._promise;
    this._promise = null;

    if (promise !== null) {
      promise.abort();
    }

    this.isFulfilled = this.isStale = false;
    this.isRejected = true;
    this.reason = reason;
    this.timestamp = timestamp;

    notify(this, 'rejected');
  }

  activate(): () => void {
    let isActive = true;

    if (this._activeCount++ === 0) {
      notify(this, 'activated');
    }

    return () => {
      if (isActive) {
        isActive = false;

        if (--this._activeCount === 0) {
          notify(this, 'deactivated');
        }
      }
    };
  }

  subscribe(listener: (event: ExecutorEvent) => void): () => void {
    return this._pubSub.subscribe(listener);
  }

  toJSON(): ExecutorState<Value> {
    return {
      key: this.key,
      isFulfilled: this.isFulfilled,
      isRejected: this.isRejected,
      isStale: this.isStale,
      value: this.value,
      reason: this.reason,
      timestamp: this.timestamp,
    };
  }
}

function notify(executor: ExecutorImpl, eventType: ExecutorEvent['type']): void {
  executor.version++;
  executor._pubSub.publish({ type: eventType, target: executor });
}

import { AbortablePromise, PubSub } from 'parallel-universe';
import type { ExecutorManager } from './ExecutorManager';
import type {
  Executor,
  ExecutorAnnotations,
  ExecutorEvent,
  ExecutorEventType,
  ExecutorState,
  ExecutorTask,
} from './types';
import { AbortError, noop } from './utils';

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
  annotations: ExecutorAnnotations = Object.create(null);
  version = 0;
  pendingPromise: AbortablePromise<Value> | null = null;

  /**
   * The number of times the executor was activated.
   */
  _activationCount = 0;

  /**
   * The pubsub that handles the executor subscriptions.
   */
  _pubSub = new PubSub<ExecutorEvent>();

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
    return this.pendingPromise !== null;
  }

  get isInvalidated(): boolean {
    return this.invalidatedAt !== 0;
  }

  constructor(
    readonly key: unknown,
    readonly manager: ExecutorManager
  ) {}

  get(): Value {
    if (this.isFulfilled) {
      return this.value!;
    }
    throw this.isSettled ? this.reason : new Error('The executor is not settled');
  }

  getOrDefault<DefaultValue>(defaultValue?: DefaultValue): Value | DefaultValue | undefined {
    return this.isFulfilled ? this.value : defaultValue;
  }

  getOrAwait(): AbortablePromise<Value> {
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
  }

  execute(task: ExecutorTask<Value>): AbortablePromise<Value> {
    const promise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this.pendingPromise === promise) {
          this.pendingPromise = null;
          this.version++;
        }
        this.publish('aborted');
      });

      new Promise<Value>(resolve => {
        const value = task(signal, this);
        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (signal.aborted) {
            return;
          }
          this.pendingPromise = null;
          this.resolve(value);
          resolve(value);
        },

        reason => {
          if (signal.aborted) {
            return;
          }
          this.pendingPromise = null;
          this.reject(reason);
          reject(reason);
        }
      );
    });

    promise.catch(noop);

    const { pendingPromise } = this;
    this.pendingPromise = promise;

    if (pendingPromise !== null) {
      pendingPromise.abort(AbortError('The task was replaced'));
    } else {
      this.version++;
    }

    if (this.pendingPromise === promise) {
      this.task = task;
      this.publish('pending');
    }

    return promise;
  }

  retry(): void {
    if (this.task !== null && !this.isPending) {
      this.execute(this.task);
    }
  }

  clear(): void {
    if (this.isSettled) {
      this.isFulfilled = false;
      this.value = this.reason = undefined;
      this.settledAt = this.invalidatedAt = 0;
      this.version++;
      this.publish('cleared');
    }
  }

  abort(reason: unknown = AbortError('The executor was aborted')): void {
    this.pendingPromise?.abort(reason);
  }

  invalidate(invalidatedAt = Date.now()): void {
    if (!this.isInvalidated && this.isSettled) {
      this.invalidatedAt = invalidatedAt;
      this.version++;
      this.publish('invalidated');
    }
  }

  resolve(value: PromiseLike<Value> | Value, settledAt = Date.now()): void {
    if (value !== null && typeof value === 'object' && 'then' in value) {
      this.execute(() => value);
      return;
    }

    const { pendingPromise } = this;
    this.pendingPromise = null;

    pendingPromise?.abort();

    this.isFulfilled = true;
    this.value = value;
    this.settledAt = settledAt;
    this.invalidatedAt = 0;

    this.version++;
    this.publish('fulfilled');
  }

  reject(reason: any, settledAt = Date.now()): void {
    const { pendingPromise } = this;
    this.pendingPromise = null;

    pendingPromise?.abort();

    this.isFulfilled = false;
    this.reason = reason;
    this.settledAt = settledAt;
    this.invalidatedAt = 0;

    this.version++;
    this.publish('rejected');
  }

  activate(): () => void {
    let isApplicable = true;

    if (this._activationCount++ === 0) {
      this.publish('activated');
    }

    return () => {
      if (isApplicable && ((isApplicable = false), --this._activationCount === 0)) {
        this.publish('deactivated');
      }
    };
  }

  subscribe(listener: (event: ExecutorEvent) => void): () => void {
    return this._pubSub.subscribe(listener);
  }

  publish(eventType: ExecutorEventType, payload?: unknown): void {
    this._pubSub.publish({ type: eventType, target: this, version: this.version, payload });
  }

  annotate(patch: ExecutorAnnotations): void {
    this.version++;
    Object.assign(this.annotations, patch);
    this.publish('annotated');
  }

  toJSON(): ExecutorState<Value> {
    return {
      key: this.key,
      isFulfilled: this.isFulfilled,
      value: this.value,
      reason: this.reason,
      annotations: this.annotations,
      settledAt: this.settledAt,
      invalidatedAt: this.invalidatedAt,
    };
  }
}

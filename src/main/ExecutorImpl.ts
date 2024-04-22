import { AbortablePromise, Awaitable, PubSub } from 'parallel-universe';
import type { Executor, ExecutorEvent, Task } from './types';
import { isEqual, isPromiseLike } from './utils';

/**
 * The default {@link Executor} implementation returned by the {@link ExecutorManager}.
 *
 * @internal
 */
export class ExecutorImpl<Value = any> extends PubSub<ExecutorEvent> implements Executor {
  isFulfilled = false;
  isRejected = false;
  isInvalidated = false;
  value: Value | undefined;
  reason: any;

  /**
   * The last task passed to {@link execute}, or `null` if executor wasn't settled through {@link execute}.
   */
  task: Task<Value> | null = null;

  /**
   * The promise of the pending task execution, or `null` if there's no pending task execution.
   */
  taskPromise: AbortablePromise<Value> | null = null;

  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  get isPending() {
    return this.taskPromise !== null;
  }

  constructor(public readonly key: string) {
    super();
  }

  getOrWait(): AbortablePromise<Value> {
    return new AbortablePromise((resolve, _reject, signal) => {
      if (this.isFulfilled) {
        resolve(this.value!);
        return;
      }

      const unsubscribe = this.subscribe(event => {
        if (event.type === 'fulfilled') {
          resolve(this.value!);
          unsubscribe();
        }
      });

      signal.addEventListener('abort', unsubscribe);
    });
  }

  getOrThrow(): Value {
    if (this.isFulfilled) {
      return this.value!;
    }
    if (this.isRejected) {
      throw this.reason;
    }
    throw new DOMException('Executor is not settled', 'InvalidStateError');
  }

  getOrDefault(defaultValue: Value): Value {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  execute(task: Task<Value>): AbortablePromise<Value> {
    this.task = task;

    const taskPromise = new AbortablePromise<Value>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this.taskPromise === taskPromise) {
          this.taskPromise = null;
          this.publish({ type: 'aborted', target: this });
        }
      });

      new Promise<Value>(resolve => {
        const value = task(signal, this.value);

        resolve(value instanceof AbortablePromise ? value.withSignal(signal) : value);
      }).then(
        value => {
          if (this.taskPromise === taskPromise) {
            this.taskPromise = null;
            this.resolve(value);
          }
          resolve(value);
        },
        reason => {
          if (this.taskPromise === taskPromise) {
            this.taskPromise = null;
            this.reject(reason);
          }
          reject(reason);
        }
      );
    });

    const prevTaskPromise = this.taskPromise;
    this.taskPromise = taskPromise;

    if (prevTaskPromise !== null) {
      prevTaskPromise.abort();
    }

    this.publish({ type: 'pending', target: this });

    return taskPromise;
  }

  retry(): AbortablePromise<Value> {
    if (this.taskPromise !== null) {
      return this.taskPromise;
    }
    if (this.task !== null) {
      return this.execute(this.task);
    }
    return new AbortablePromise<Value>((_resolve, reject) => {
      reject(new DOMException('Executor has no task to retry', 'InvalidStateError'));
    });
  }

  clear(): this {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = this.isInvalidated = false;
      this.value = this.reason = undefined;
      this.publish({ type: 'cleared', target: this });
    }
    return this;
  }

  abort(reason?: unknown): this {
    if (this.taskPromise !== null) {
      this.taskPromise.abort(reason);
    }
    return this;
  }

  invalidate(): this {
    if (this.isInvalidated !== (this.isInvalidated = this.isSettled)) {
      this.publish({ type: 'invalidated', target: this });
    }
    return this;
  }

  resolve(value: Awaitable<Value>): this {
    const taskPromise = this.taskPromise;

    if (isPromiseLike(value)) {
      this.execute(() => value);
      return this;
    }
    if (
      (taskPromise !== null && ((this.taskPromise = null), taskPromise.abort(), true)) ||
      this.isInvalidated ||
      !this.isFulfilled ||
      !isEqual(this.value, value)
    ) {
      this.isFulfilled = true;
      this.isRejected = this.isInvalidated = false;
      this.value = value;
      this.reason = undefined;
      this.publish({ type: 'fulfilled', target: this });
    }
    return this;
  }

  reject(reason: any): this {
    const taskPromise = this.taskPromise;

    if (
      (taskPromise !== null && ((this.taskPromise = null), taskPromise.abort(), true)) ||
      this.isInvalidated ||
      !this.isRejected ||
      !isEqual(this.reason, reason)
    ) {
      this.isFulfilled = this.isInvalidated = false;
      this.isRejected = true;
      this.value = undefined;
      this.reason = reason;
      this.publish({ type: 'rejected', target: this });
    }
    return this;
  }
}

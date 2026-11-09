import { ExecutorManager, type ExecutorManagerOptions } from '../ExecutorManager.ts';
import type { Executor, Serializer } from '../types.ts';

/**
 * Options provided to the {@link SSRExecutorManager} constructor.
 */
export interface SSRExecutorManagerOptions extends ExecutorManagerOptions {
  /**
   * Stringifies executor keys and state snapshots before sending them to the client.
   *
   * @default JSON
   */
  serializer?: Serializer;

  /**
   * Selects executors whose state is sent to the client. By default, only fulfilled executors are sent.
   *
   * @param executor The executor to check.
   * @returns `true` if the executor state must be sent to the client, or `false` otherwise.
   */
  executorPredicate?: (executor: Executor) => boolean;

  /**
   * A nonce string to allow hydration scripts under a
   * [`script-src` Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src).
   */
  nonce?: string;
}

/**
 * The executor manager that sends executor states to the client during server-side rendering.
 */
export class SSRExecutorManager extends ExecutorManager {
  /**
   * Map from an executor to a version of the state that was sent to the client for hydration.
   */
  protected _hydratedVersions = new WeakMap<Executor, number>();

  /**
   * Stringifies executor keys and state snapshots before sending them to the client.
   */
  protected _serializer;

  /**
   * Selects executors whose state is sent to the client.
   */
  protected _executorPredicate;

  /**
   * A nonce string to allow hydration scripts under a
   * [`script-src` Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src).
   */
  nonce;

  /**
   * Creates a new SSR executor manager.
   *
   * @param options Manager options.
   */
  constructor(options: SSRExecutorManagerOptions = {}) {
    const { serializer = JSON, executorPredicate = executor => executor.isFulfilled } = options;

    super(options);

    this._serializer = serializer;
    this._executorPredicate = executorPredicate;

    this.nonce = options.nonce;
  }

  /**
   * Waits until no executors are pending, and resolves with `true` if the state of any executor has changed since
   * this method was called, or `false` otherwise. Use it to re-render the app on the server until all data is loaded.
   *
   * The returned promise is rejected if executors are still pending after `maxRetries` attempts. This usually means
   * that a plugin keeps re-executing tasks during SSR.
   *
   * @param maxRetries The maximum number of times to wait for executors that become pending again. Increase it if
   * data is loaded in many sequential steps.
   */
  hasChanges(maxRetries = 10): Promise<boolean> {
    const getVersion = () => Array.from(this).reduce((version, executor) => version + executor.version, 0);

    const initialVersion = getVersion();

    let retryCount = 0;

    const hasChanges = (): Promise<boolean> => {
      if (++retryCount > maxRetries) {
        return Promise.reject(
          new Error('Too many retries. Ensure SSR plugins do not retry indefinitely, or increase maxRetries.')
        );
      }

      return Promise.allSettled(Array.from(this).map(executor => executor.promise)).then(() =>
        Array.from(this).some(executor => executor.isPending) ? hasChanges() : getVersion() !== initialVersion
      );
    };

    return hasChanges();
  }

  /**
   * Returns a `<script>` tag that sends the client the states of executors that have changed since they were last
   * sent, or an empty string if there are no such changes.
   */
  nextHydrationChunk(): string {
    const source = this.nextHydrationScriptSource();

    if (source === '') {
      return source;
    }

    return (this.nonce === undefined ? '<script>' : '<script nonce="' + this.nonce + '">') + source + '</script>';
  }

  /**
   * Returns the source of a script that sends the client the states of executors that have changed since they were
   * last sent, or an empty string if there are no such changes.
   */
  nextHydrationScriptSource(): string {
    const sources = [];

    for (const executor of this._executors.values()) {
      if (this._hydratedVersions.get(executor) !== executor.version && this._executorPredicate(executor)) {
        sources.push(
          JSON.stringify(this._serializer.stringify(executor.key)),
          JSON.stringify(this._serializer.stringify(executor.getStateSnapshot()))
        );

        this._hydratedVersions.set(executor, executor.version);
      }
    }

    if (sources.length === 0) {
      return '';
    }

    return (
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push(' +
      sources.join(',').replace(/</g, '\\u003C') +
      ');var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  }

  /**
   * Aborts the pending tasks of all executors. The executor results are preserved as is.
   *
   * @param reason The reason that rejects the aborted task promises.
   */
  abort(reason?: unknown): void {
    for (const executor of this) {
      executor.abort(reason);
    }
  }
}

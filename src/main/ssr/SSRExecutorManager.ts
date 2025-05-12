import { ExecutorManager, type ExecutorManagerOptions } from '../ExecutorManager.js';
import type { Executor, ExecutorState } from '../types.js';

/**
 * Options provided to the {@link SSRExecutorManager} constructor.
 */
export interface SSRExecutorManagerOptions extends ExecutorManagerOptions {
  /**
   * Stringifies an executor state before it is sent to the client.
   *
   * @param state The executor state to stringify.
   * @default JSON.stringify
   */
  stateStringifier?: (state: ExecutorState) => string;

  /**
   * Filters executors that must be hydrated on the client with the state that was accumulated during SSR.
   *
   * By default, only executors that were fulfilled during SSR are hydrated on the client.
   *
   * @param executor The executor to check.
   * @returns `true` if the executor must be hydrated on the client, or `false` otherwise.
   */
  executorFilter?: (executor: Executor) => boolean;

  /**
   * A nonce string to allow hydration scripts under a
   * [`script-src` Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src).
   */
  nonce?: string;
}

/**
 * The base implementation of the executor manager that supports client hydration after SSR.
 */
export class SSRExecutorManager extends ExecutorManager {
  /**
   * Map from an executor to a version of the state that was sent to the client for hydration.
   */
  protected _hydratedVersions = new WeakMap<Executor, number>();

  /**
   * Stringifies the state of the executor before sending it to the client.
   */
  protected _stateStringifier;

  /**
   * Filters executors that must be hydrated on the client with the state that was accumulated during SSR.
   */
  protected _executorFilter;

  /**
   * A nonce string to allow hydration scripts under a
   * [`script-src` Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src).
   */
  nonce;

  /**
   * Creates a new {@link SSRExecutorManager} instance.
   *
   * @param options Additional options.
   */
  constructor(options: SSRExecutorManagerOptions = {}) {
    const { stateStringifier = JSON.stringify, executorFilter = executor => executor.isFulfilled } = options;

    super(options);

    this._stateStringifier = stateStringifier;
    this._executorFilter = executorFilter;

    this.nonce = options.nonce;
  }

  /**
   * Returns an inline `<script>` tag with source that hydrates the client with the state accumulated during SSR,
   * or an empty string if there are no state changes since the last time {@link nextHydrationScript} was called.
   */
  nextHydrationChunk(): string {
    const source = this.nextHydrationScript();

    if (source === '') {
      return source;
    }

    return (this.nonce === undefined ? '<script>' : '<script nonce="' + this.nonce + '">') + source + '</script>';
  }

  /**
   * Returns a script source that hydrates the client with the state accumulated during SSR, or an empty string if there
   * are no state changes since the last time {@link nextHydrationScript} was called.
   */
  nextHydrationScript(): string {
    const stateStrs = [];

    for (const executor of this._executors.values()) {
      if (this._hydratedVersions.get(executor) !== executor.version && this._executorFilter(executor)) {
        stateStrs.push(JSON.stringify(this._stateStringifier(executor.toJSON())));

        this._hydratedVersions.set(executor, executor.version);
      }
    }

    if (stateStrs.length === 0) {
      return '';
    }

    return (
      '(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push(' +
      stateStrs.join(',').replace(/</g, '\\u003C') +
      ');var e=document.currentScript;e&&e.parentNode.removeChild(e);'
    );
  }

  /**
   * Instantly aborts all pending executors and preserves their available results as is.
   *
   * @param reason The abort reason that is used for rejection of the pending task promises.
   */
  abort(reason?: unknown): void {
    for (const executor of this) {
      executor.abort(reason);
    }
  }

  /**
   * Resolves with `true` if there were pending executors and their state has changed after they became non-pending.
   * Otherwise, resolves with `false`.
   */
  hasChanges(): Promise<boolean> {
    const getVersion = () => Array.from(this).reduce((version, executor) => version + executor.version, 0);

    const initialVersion = getVersion();

    const hasChanges = (): Promise<boolean> =>
      Promise.allSettled(Array.from(this).map(executor => executor.promise)).then(() =>
        Array.from(this).some(executor => executor.isPending) ? hasChanges() : getVersion() !== initialVersion
      );

    return hasChanges();
  }
}

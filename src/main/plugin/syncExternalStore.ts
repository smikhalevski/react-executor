/**
 * The plugin that synchronizes the executor state with an external store.
 *
 * ```ts
 * import syncExternalStore from 'react-executor/plugin/syncExternalStore';
 *
 * const executor = useExecutor('test', 42, [
 *   syncExternalStore(myStore),
 * ]);
 * ```
 *
 * @module plugin/syncExternalStore
 */

import type { ExecutorPlugin, ExecutorState, Observable, PluginConfiguredPayload } from '../types.js';
import { isObjectLike, isShallowEqual } from '../utils.js';
import type { ExecutorImpl } from '../ExecutorImpl.js';

/**
 * The external store that holds a value and notifies subscribers when the value changes.
 *
 * @template Value The value held by the external store.
 */
export interface ExternalStore<Value = any> extends Observable<Value | null | undefined | void> {
  /**
   * Returns the current stored value, or `null` if there's no value.
   */
  get(): Value | null;

  /**
   * Stores a new value. Read-only stores can omit this method.
   *
   * @param value The value to store.
   */
  set?(value: Value): void;

  /**
   * Deletes the stored value. Called when the executor is detached. Read-only stores can omit this method.
   */
  delete?(): void;
}

/**
 * Synchronizes the executor state with an external store. The store is updated when the executor state changes,
 * and the executor is updated when the stored state changes.
 *
 * @param store The store that holds the executor state.
 * @template Value The value stored by the executor.
 */
export default function syncExternalStore<Value>(store: ExternalStore<ExecutorState<Value>>): ExecutorPlugin<Value> {
  return executor => {
    let externalVersion = -1;

    // true while the plugin is being applied to the executor
    let isInitializing = true;

    // true if the external state has changed while the executor was pending
    let isExternalStateSkipped = false;

    // true if the executor state has changed while the executor was pending
    let isExecutorStateSkipped = false;

    const setExternalState = () => {
      if (executor.isPending) {
        // The state of a pending executor can be rolled back, so it is persisted when the task is settled or aborted
        isExecutorStateSkipped = true;
        return;
      }
      if (externalVersion === (externalVersion = executor.version)) {
        return;
      }
      isExternalStateSkipped = isExecutorStateSkipped = false;
      store.set?.(executor.getStateSnapshot());
    };

    const setExecutorState = (nextState: ExecutorState | null | undefined | void = store.get()) => {
      if (executor.isPending) {
        // The executor would overwrite external state when settled
        isExternalStateSkipped = true;
        return;
      }

      isExternalStateSkipped = isExecutorStateSkipped = false;

      const prevState = executor.getStateSnapshot();

      if (!isExecutorState(nextState) || isOutdatedState(nextState, prevState, isInitializing)) {
        // Overwrite the external store because it holds no state or the state is outdated
        externalVersion = -1;
        setExternalState();
        return;
      }

      externalVersion = executor.version + 1;
      publishChanges(executor as ExecutorImpl, prevState, nextState);
    };

    const unsubscribe = store.subscribe(setExecutorState);

    executor.subscribe(event => {
      switch (event.type) {
        case 'annotated':
        case 'fulfilled':
        case 'rejected':
        case 'cleared':
        case 'invalidated':
          setExternalState();
          break;

        case 'aborted':
          if (isExternalStateSkipped) {
            // The aborted task won't overwrite the external state that has changed while it was pending
            setExecutorState();
          } else if (isExecutorStateSkipped) {
            // Persist the executor state that has changed while the task was pending
            setExternalState();
          }
          break;

        case 'detached':
          store.delete?.();
          unsubscribe();
          break;
      }
    });

    executor.publish({
      type: 'plugin_configured',
      payload: { type: 'syncExternalStore', options: { store } } satisfies PluginConfiguredPayload,
    });

    setExecutorState(store.get());

    isInitializing = false;
  };
}

/**
 * Returns `true` if the external state is older than the executor state.
 *
 * @param nextState The external state.
 * @param prevState The executor state.
 * @param isInitializing `true` if the plugin is being applied to the executor.
 */
function isOutdatedState(nextState: ExecutorState, prevState: ExecutorState, isInitializing: boolean): boolean {
  if (nextState.settledAt !== 0) {
    return nextState.settledAt < prevState.settledAt;
  }

  // An unsettled state has no timestamp. While the plugin is being applied, a settled executor (for example, hydrated
  // after SSR) is newer. Afterwards, an unsettled state means that the executor was cleared elsewhere.
  return isInitializing && prevState.settledAt !== 0;
}

function publishChanges(executor: ExecutorImpl, prevState: ExecutorState, nextState: ExecutorState): void {
  // Update the executor with the external state
  executor.value = nextState.value;
  executor.reason = nextState.reason;
  executor.annotations = nextState.annotations;
  executor.settledAt = nextState.settledAt;
  executor.invalidatedAt = nextState.invalidatedAt;
  executor.isFulfilled = nextState.isFulfilled;
  executor.version++;

  if (!isShallowEqual(nextState.annotations, prevState.annotations)) {
    // Annotations have changed
    executor.publish({ type: 'annotated' });
  }

  if (
    nextState.settledAt !== prevState.settledAt ||
    nextState.isFulfilled !== prevState.isFulfilled ||
    !Object.is(prevState.value, nextState.value) ||
    !Object.is(prevState.reason, nextState.reason)
  ) {
    if (nextState.isFulfilled) {
      executor.publish({ type: 'fulfilled' });
    } else if (nextState.settledAt !== 0) {
      executor.publish({ type: 'rejected' });
    } else if (prevState.settledAt !== 0) {
      executor.publish({ type: 'cleared' });
    }
  }

  if (nextState.invalidatedAt !== 0 && prevState.invalidatedAt === 0) {
    // Next is invalidated
    executor.publish({ type: 'invalidated' });
  }
}

function isExecutorState(state: ExecutorState | null): state is ExecutorState {
  return (
    isObjectLike(state) &&
    isObjectLike(state.annotations) &&
    Number.isInteger(state.settledAt) &&
    Number.isInteger(state.invalidatedAt) &&
    typeof state.isFulfilled === 'boolean' &&
    (state.settledAt !== 0 || !state.isFulfilled)
  );
}

/**
 * The plugin that persists the executor state in the observable external store.
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
 * The observable external store.
 *
 * @template Value The value held by the external store.
 */
export interface ExternalStore<Value = any> extends Observable<Value | null | undefined | void> {
  /**
   * Returns the current stored value, or `null` if there's no value.
   */
  get(): Value | null;

  /**
   * Sets a new value to the store.
   *
   * @param value A value to set.
   */
  set?(value: Value): void;

  /**
   * Deletes a value from the store.
   */
  delete?(): void;
}

/**
 * Persists the executor state in the observable external store.
 *
 * @param store The external store to persist executor state.
 * @template Value The value stored by the executor.
 */
export default function syncExternalStore<Value>(store: ExternalStore<ExecutorState<Value>>): ExecutorPlugin<Value> {
  return executor => {
    let externalVersion = -1;

    const setExternalState = () => {
      if (externalVersion === (externalVersion = executor.version)) {
        return;
      }
      store.set?.(executor.getStateSnapshot());
    };

    const setExecutorState = (nextState: ExecutorState | null | undefined | void = store.get()) => {
      if (executor.isPending) {
        // The executor would overwrite external state when settled
        return;
      }

      const prevState = executor.getStateSnapshot();

      if (!isExecutorState(nextState) || (nextState.settledAt !== 0 && nextState.settledAt < prevState.settledAt)) {
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
          setExecutorState(store.get());
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
  };
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
    nextState.settledAt !== nextState.settledAt ||
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

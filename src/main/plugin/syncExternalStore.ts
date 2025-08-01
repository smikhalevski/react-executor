import type { ExecutorPlugin, ExecutorState, Observable, PluginConfiguredPayload } from '../types.js';
import { isObjectLike, isShallowEqual } from '../utils.js';
import type { ExecutorImpl } from '../ExecutorImpl.js';

export interface ExternalStore<Value> extends Observable<Value | null> {
  get(): Value | null;

  set?(value: Value): void;

  delete?(): void;
}

export default function syncExternalStore<Value>(store: ExternalStore<ExecutorState<Value>>): ExecutorPlugin<Value> {
  return executor => {
    const setExternalState = () => store.set?.(executor.getStateSnapshot());

    const setExecutorState = (nextState: ExecutorState | null) => {
      if (executor.isPending) {
        // The executor would overwrite external state when settled
        return;
      }

      const prevState = executor.getStateSnapshot();

      if (
        // No external state
        nextState === null ||
        // Invalid external state
        !isExecutorState(nextState) ||
        // External state is outdated
        (nextState.settledAt !== 0 && nextState.settledAt < prevState.settledAt)
      ) {
        setExternalState();
        return;
      }

      publishChanges(executor as ExecutorImpl, prevState, nextState);
    };

    const unsubscribe = store.subscribe(setExecutorState);

    setExecutorState(store.get());

    executor.subscribe(event => {
      switch (event.type) {
        case 'cleared':
        case 'fulfilled':
        case 'rejected':
        case 'invalidated':
        case 'annotated':
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

  // The executor was resolved, rejected or cleared
  if (nextState.isFulfilled) {
    executor.publish({ type: 'fulfilled' });
  } else if (nextState.settledAt !== 0) {
    executor.publish({ type: 'rejected' });
  } else if (prevState.settledAt !== 0) {
    executor.publish({ type: 'cleared' });
  }

  if (nextState.invalidatedAt !== 0 && prevState.invalidatedAt === 0) {
    // The executor was invalidated
    executor.publish({ type: 'invalidated' });
  }
}

function isExecutorState(state: ExecutorState | null): state is ExecutorState {
  return (
    isObjectLike(state) &&
    isObjectLike(state.annotations) &&
    typeof state.settledAt === 'number' &&
    typeof state.invalidatedAt === 'number' &&
    typeof state.isFulfilled === 'boolean'
  );
}

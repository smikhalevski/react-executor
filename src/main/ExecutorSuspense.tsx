import React, { ReactElement, ReactNode, Suspense } from 'react';
import { Executor } from './types';
import { useExecutorSubscription } from './useExecutorSubscription';
import { useExecutorSuspense } from './useExecutorSuspense';

/**
 * Props of {@link ExecutorSuspense}.
 *
 * @template Value The value stored by the executor.
 */
export interface ExecutorSuspenseProps<Value> {
  /**
   * Executors to wait for.
   */
  executor: Executor<Value>;

  /**
   * Renders contents of {@link executor}.
   */
  children: ((executor: Executor<Value>) => ReactNode) | ReactNode;

  /**
   * The fallback that is rendered when executor are pending.
   */
  fallback?: ReactNode;

  /**
   * The predicate which a pending executor must conform to suspend the rendering process. By default,
   * only non-fulfilled executor are awaited.
   */
  predicate?: (executor: Executor<Value>) => boolean;
}

/**
 * Renders a {@link ExecutorSuspenseProps.fallback fallback} if a provided
 * {@link ExecutorSuspenseProps.executor executor} isn't settled.
 *
 * @template Value The value stored by the executor.
 */
export function ExecutorSuspense<Value>(props: ExecutorSuspenseProps<Value>): ReactElement {
  useExecutorSubscription(props.executor);

  return (
    <Suspense fallback={props.fallback}>
      <ExecutorSuspenseContent {...props} />
    </Suspense>
  );
}

ExecutorSuspense.displayName = 'ExecutorSuspense';

function ExecutorSuspenseContent<Value>(props: ExecutorSuspenseProps<Value>): ReactNode {
  const { children, executor } = props;

  useExecutorSuspense(executor, props.predicate);

  return typeof children === 'function' ? children(executor) : children;
}

ExecutorSuspenseContent.displayName = 'ExecutorSuspenseContent';

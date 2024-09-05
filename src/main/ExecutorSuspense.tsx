import React, { ReactNode, Suspense } from 'react';
import { Executor } from './types';
import { useExecutorSuspense } from './useExecutorSuspense';

/**
 * Props of {@link ExecutorSuspense}.
 *
 * @template T Executors to wait for.
 */
export interface ExecutorSuspenseProps<T extends Executor | Executor[]> {
  /**
   * Executors to wait for.
   */
  executors: T;

  /**
   * Renders contents of {@link executors}.
   */
  children: ((executors: T) => ReactNode) | ReactNode;

  /**
   * The fallback that is rendered when executors are pending.
   */
  fallback?: ReactNode;

  /**
   * The predicate which a pending executor must conform to suspend the rendering process. By default,
   * only non-fulfilled executors are awaited.
   */
  predicate?: (executor: Executor) => boolean;
}

/**
 * Renders a {@link ExecutorSuspenseProps.fallback fallback} if any of provided
 * {@link ExecutorSuspenseProps.executors executors} aren't settled.
 *
 * @template T Executors to wait for.
 */
export function ExecutorSuspense<T extends Executor | Executor[]>(props: ExecutorSuspenseProps<T>) {
  return (
    <Suspense fallback={props.fallback}>
      <ExecutorSuspenseContent {...props} />
    </Suspense>
  );
}

ExecutorSuspense.displayName = 'ExecutorSuspense';

function ExecutorSuspenseContent(props: ExecutorSuspenseProps<any>): ReactNode {
  const { children, executors } = props;

  useExecutorSuspense(executors, props.predicate);

  return typeof children === 'function' ? children(executors) : children;
}

ExecutorSuspenseContent.displayName = 'ExecutorSuspenseContent';

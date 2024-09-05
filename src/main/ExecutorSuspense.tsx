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
  children: (executors: T) => ReactNode;

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
      <ExecutorSuspenseContent props={props} />
    </Suspense>
  );
}

ExecutorSuspense.displayName = 'ExecutorSuspense';

interface ExecutorSuspenseContentProps {
  props: ExecutorSuspenseProps<any>;
}

function ExecutorSuspenseContent({ props }: ExecutorSuspenseContentProps): ReactNode {
  return props.children(useExecutorSuspense(props.executors, props.predicate));
}

ExecutorSuspenseContent.displayName = 'ExecutorSuspenseContent';

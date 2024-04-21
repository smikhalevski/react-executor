import type { DependencyList } from 'react';

export const emptyDeps: DependencyList = [];

export function noop(): void {}

/**
 * [SameValueZero](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero) comparison.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

/**
 * Returns `true` is value has `then` property that is a function.
 */
export function isPromiseLike<T>(value: any): value is PromiseLike<T> {
  return value !== null && typeof value === 'object' && typeof value.then === 'function';
}

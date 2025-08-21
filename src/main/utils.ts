import { Observable } from './types.js';

export const emptyObject = {};

export function noop() {}

export function AbortError(message: string): Error {
  return typeof DOMException !== 'undefined' ? new DOMException(message, 'AbortError') : Error(message);
}

export function TimeoutError(message: string): Error {
  return typeof DOMException !== 'undefined' ? new DOMException(message, 'TimeoutError') : Error(message);
}

export function isPromiseLike(value: unknown): value is PromiseLike<any> {
  return isObjectLike(value) && 'then' in value;
}

export function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

export function isShallowEqual(a: object, b: object): boolean;

export function isShallowEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  const keys = Object.keys(a);

  if (keys.length !== Object.keys(b).length) {
    return false;
  }

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

export function throwUnhandled(error: unknown): void {
  setTimeout(() => {
    throw error;
  }, 0);
}

/**
 * Returns the observable that inverses boolean values emitted by another observable.
 *
 * @param observable The observable to inverse.
 */
export function negate(observable: Observable<any>): Observable<boolean> {
  return {
    subscribe: listener => observable.subscribe(value => listener(!value)),
  };
}

export function preventUnhandledRejection<T extends PromiseLike<any>>(promise: T): T {
  promise.then(noop, noop);
  return promise;
}

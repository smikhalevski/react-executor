export const emptyObject = {};

export function noop() {}

export function AbortError(message: string): Error {
  return typeof DOMException !== 'undefined' ? new DOMException(message, 'AbortError') : Error(message);
}

export function TimeoutError(message: string): Error {
  return typeof DOMException !== 'undefined' ? new DOMException(message, 'TimeoutError') : Error(message);
}

export function isObjectLike(value: any): value is object {
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

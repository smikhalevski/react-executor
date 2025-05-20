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

export function getKeyCount(value: object): number {
  return Object.keys(value).length;
}

export function noop() {}

export function AbortError(message: string): Error {
  return typeof DOMException !== 'undefined' ? new DOMException(message, 'AbortError') : Error(message);
}

export function isMatchingPeerKey(keys: Array<RegExp | string>, peerKey: string) {
  for (const key of keys) {
    if (typeof key === 'string' ? key === peerKey : key.test(peerKey)) {
      return true;
    }
  }
  return false;
}

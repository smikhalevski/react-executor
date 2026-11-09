import { afterEach, describe, expect, test, vi } from 'vitest';
import { PubSub } from '../main/PubSub.js';
import { AbortError, isPromiseLike, isShallowEqual, negate, noop, rethrowAsync, TimeoutError } from '../main/utils.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('negate', () => {
  test('inverses published value', () => {
    const listenerMock = vi.fn();

    const pubSub1 = new PubSub<boolean>();
    const pubSub2 = negate(pubSub1);

    pubSub2.subscribe(listenerMock);

    pubSub1.publish(true);
    pubSub1.publish(false);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, false);
    expect(listenerMock).toHaveBeenNthCalledWith(2, true);
  });
});

describe('isShallowEqual', () => {
  test('returns true if objects have the same properties', () => {
    expect(isShallowEqual({ aaa: 111, bbb: 222 }, { bbb: 222, aaa: 111 })).toBe(true);
  });

  test('returns false if property values are different', () => {
    expect(isShallowEqual({ aaa: 111 }, { aaa: 222 })).toBe(false);
  });

  test('returns false if the second object has more properties', () => {
    expect(isShallowEqual({ aaa: 111 }, { aaa: 111, bbb: 222 })).toBe(false);
  });

  test('distinguishes a missing property from an undefined property', () => {
    expect(isShallowEqual({ aaa: undefined }, { bbb: undefined })).toBe(false);
  });
});

describe('isPromiseLike', () => {
  test('returns true for an object with a then method', () => {
    expect(isPromiseLike({ then: noop })).toBe(true);
  });

  test('returns false for an object with a non-callable then property', () => {
    expect(isPromiseLike({ then: 'aaa' })).toBe(false);
  });

  test('returns false for null', () => {
    expect(isPromiseLike(null)).toBe(false);
  });
});

describe('AbortError', () => {
  test('returns a DOMException with the AbortError name', () => {
    expect(AbortError('aaa')).toEqual(new DOMException('aaa', 'AbortError'));
  });

  test('returns an Error if DOMException is not supported', () => {
    vi.stubGlobal('DOMException', undefined);

    expect(AbortError('aaa')).toEqual(new Error('aaa'));
  });
});

describe('TimeoutError', () => {
  test('returns a DOMException with the TimeoutError name', () => {
    expect(TimeoutError('aaa')).toEqual(new DOMException('aaa', 'TimeoutError'));
  });

  test('returns an Error if DOMException is not supported', () => {
    vi.stubGlobal('DOMException', undefined);

    expect(TimeoutError('aaa')).toEqual(new Error('aaa'));
  });
});

describe('rethrowAsync', () => {
  test('throws the error asynchronously', () => {
    vi.useFakeTimers();

    rethrowAsync(new Error('expected'));

    expect(() => vi.runAllTimers()).toThrow('expected');
  });

  test('throws the error asynchronously if setTimeout returns a number', () => {
    // Browsers return a number from setTimeout, while Node.js returns an object
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockReturnValue(
      // @ts-expect-error Node.js typings expect a Timeout object
      111
    );

    rethrowAsync(new Error('expected'));

    expect(setTimeoutSpy.mock.calls[0][0]).toThrow('expected');
  });
});

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PubSub } from '../main/PubSub.js';

let pubSub: PubSub<string>;

beforeEach(() => {
  pubSub = new PubSub();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('publish', () => {
  test('invokes listeners with the message in the subscription order', () => {
    const listenerMock1 = vi.fn();
    const listenerMock2 = vi.fn();

    pubSub.subscribe(listenerMock1);
    pubSub.subscribe(listenerMock2);
    pubSub.publish('aaa');

    expect(listenerMock1).toHaveBeenCalledExactlyOnceWith('aaa');
    expect(listenerMock2).toHaveBeenCalledExactlyOnceWith('aaa');
    expect(listenerMock1).toHaveBeenCalledBefore(listenerMock2);
  });

  test('delivers the message to all listeners and rethrows a listener error asynchronously', () => {
    vi.useFakeTimers();

    const listenerMock = vi.fn();

    pubSub.subscribe(() => {
      throw new Error('expected');
    });
    pubSub.subscribe(listenerMock);
    pubSub.publish('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(() => vi.runAllTimers()).toThrow('expected');
  });

  test('rethrows a rejection of a promise returned by a listener asynchronously', async () => {
    vi.useFakeTimers();

    pubSub.subscribe(() => Promise.reject(new Error('expected')));
    pubSub.publish('aaa');

    await Promise.resolve();

    expect(() => vi.runAllTimers()).toThrow('expected');
  });

  test('delivers the current message to listeners unsubscribed after a nested publish', () => {
    const listenerMock = vi.fn();

    pubSub.subscribe(message => {
      if (message === 'aaa') {
        pubSub.publish('bbb');
        pubSub.unsubscribe(listenerMock);
      }
    });
    pubSub.subscribe(listenerMock);
    pubSub.publish('aaa');

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, 'bbb');
    expect(listenerMock).toHaveBeenNthCalledWith(2, 'aaa');
  });
});

describe('subscribe', () => {
  test('subscribes a listener only once', () => {
    const listenerMock = vi.fn();

    pubSub.subscribe(listenerMock);
    pubSub.subscribe(listenerMock);
    pubSub.publish('aaa');

    expect(pubSub.listenerCount).toBe(1);
    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('returns the callback that unsubscribes the listener', () => {
    const listenerMock = vi.fn();

    const unsubscribe = pubSub.subscribe(listenerMock);

    unsubscribe();
    pubSub.publish('aaa');

    expect(pubSub.listenerCount).toBe(0);
    expect(listenerMock).not.toHaveBeenCalled();
  });

  test('does not deliver the current message to a listener subscribed during publish', () => {
    const listenerMock = vi.fn();

    pubSub.subscribe(() => {
      pubSub.subscribe(listenerMock);
    });
    pubSub.publish('aaa');
    pubSub.publish('bbb');

    expect(listenerMock).toHaveBeenCalledExactlyOnceWith('bbb');
  });
});

describe('unsubscribe', () => {
  test('no-op if the listener is not subscribed', () => {
    pubSub.subscribe(() => {});
    pubSub.unsubscribe(() => {});

    expect(pubSub.listenerCount).toBe(1);
  });

  test('delivers the current message to a listener unsubscribed during publish', () => {
    const listenerMock = vi.fn();

    pubSub.subscribe(() => {
      pubSub.unsubscribe(listenerMock);
    });
    pubSub.subscribe(listenerMock);
    pubSub.publish('aaa');

    expect(pubSub.listenerCount).toBe(1);
    expect(listenerMock).toHaveBeenCalledTimes(1);
  });
});

describe('unsubscribeAll', () => {
  test('unsubscribes all listeners', () => {
    pubSub.subscribe(() => {});
    pubSub.subscribe(() => {});
    pubSub.unsubscribeAll();

    expect(pubSub.listenerCount).toBe(0);
  });

  test('delivers the current message to listeners unsubscribed during publish', () => {
    const listenerMock = vi.fn();

    pubSub.subscribe(() => {
      pubSub.unsubscribeAll();
    });
    pubSub.subscribe(listenerMock);
    pubSub.publish('aaa');

    expect(pubSub.listenerCount).toBe(0);
    expect(listenerMock).toHaveBeenCalledTimes(1);
  });
});

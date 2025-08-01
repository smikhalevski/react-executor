import { expect, test, vi } from 'vitest';
import { PubSub } from 'parallel-universe';
import { throttle } from '../../../main/observable/___/throttle.js';

vi.useFakeTimers();

test('publishes last value', () => {
  const listenerMock = vi.fn();

  const pubSub1 = new PubSub<number>();
  const pubSub2 = throttle(pubSub1, 1_000);

  pubSub2.subscribe(listenerMock);

  pubSub1.publish(111);
  pubSub1.publish(222);
  pubSub1.publish(333);

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenNthCalledWith(1, 333);
});

test('publishes first value', () => {
  const listenerMock = vi.fn();

  const pubSub1 = new PubSub<number>();
  const pubSub2 = throttle(pubSub1, 1_000, true);

  pubSub2.subscribe(listenerMock);

  pubSub1.publish(111);

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenNthCalledWith(1, 111);

  pubSub1.publish(222);

  expect(listenerMock).toHaveBeenCalledTimes(1);

  pubSub1.publish(333);

  expect(listenerMock).toHaveBeenCalledTimes(1);

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(2, 333);
});

test('publishes value only once', () => {
  const listenerMock = vi.fn();

  const pubSub1 = new PubSub<number>();
  const pubSub2 = throttle(pubSub1, 1_000, true);

  pubSub2.subscribe(listenerMock);

  pubSub1.publish(111);

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenNthCalledWith(1, 111);

  vi.runAllTimers();

  expect(listenerMock).toHaveBeenCalledTimes(1);
});

test('does not call listener after unsubscribe', () => {
  const listenerMock = vi.fn();

  const pubSub1 = new PubSub<number>();
  const pubSub2 = throttle(pubSub1, 1_000);

  const unsubscribe = pubSub2.subscribe(listenerMock);

  pubSub1.publish(111);

  unsubscribe();

  vi.runAllTimers();

  expect(listenerMock).not.toHaveBeenCalled();
});

import { beforeEach, expect, test, vi as vi } from 'vitest';
import { type ExecutorEvent, ExecutorManager } from '../../main/index.ts';
import invalidateByPeers from '../../main/plugin/invalidateByPeers.ts';

vi.useFakeTimers();

let manager: ExecutorManager;

beforeEach(() => {
  manager = new ExecutorManager();
});

test('invalidates an executor if a peer executor is fulfilled', () => {
  const executor2 = manager.getOrCreate('yyy');
  const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers([executor2])]);

  expect(executor1.isInvalidated).toBe(false);

  executor2.resolve('bbb');

  expect(executor1.isInvalidated).toBe(true);
  expect(executor2.isInvalidated).toBe(false);
});

test('invalidates an executor if a peer executor with the matching key is fulfilled', () => {
  const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);
  const executor2 = manager.getOrCreate('yyy');

  expect(executor1.isInvalidated).toBe(false);

  executor2.resolve('bbb');

  expect(executor1.isInvalidated).toBe(true);
  expect(executor2.isInvalidated).toBe(false);
});

test('invalidates an executor if a peer executor with the matching key is invalidated', () => {
  const executor2 = manager.getOrCreate('yyy', 'bbb');
  const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);

  expect(executor1.isInvalidated).toBe(false);

  executor2.invalidate();

  expect(executor1.isInvalidated).toBe(true);
});

test('invalidates an executor if a peer executor is created with an initial value', () => {
  const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);

  manager.getOrCreate('yyy', 'bbb');

  expect(executor1.isInvalidated).toBe(true);
});

test('do not get invalidated after detach', () => {
  const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);

  manager.detach(executor1.key);

  manager.getOrCreate('yyy', 'bbb');

  expect(executor1.isInvalidated).toBe(false);
});

test('does not invalidate an executor if a non-matching executor is fulfilled', () => {
  const executor1 = manager.getOrCreate('yyy');
  const executor2 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(() => false)]);

  executor1.resolve('bbb');
  manager.getOrCreate('zzz', 'ccc');

  expect(executor2.isInvalidated).toBe(false);
});

test('does not treat an executor as its own peer', () => {
  const executor = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'xxx')]);

  expect(executor.isInvalidated).toBe(false);
});

test('removes a peer after the peer is detached', () => {
  const listenerMock = vi.fn();
  const executor1 = manager.getOrCreate('yyy');

  manager.subscribe(listenerMock);

  const executor2 = manager.getOrCreate('xxx', undefined, [invalidateByPeers(executor => executor.key === 'yyy')]);

  manager.detach(executor1.key);

  expect(listenerMock).toHaveBeenCalledTimes(4);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor2,
    version: 0,
    payload: { type: 'invalidateByPeers', options: { peers: [executor1] } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor2,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'detached',
    target: executor1,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'plugin_configured',
    target: executor2,
    version: 0,
    payload: { type: 'invalidateByPeers', options: { peers: [] } },
  } satisfies ExecutorEvent);
});

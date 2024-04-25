import { ExecutorManager } from '../../main';
import invalidateByPeers from '../../main/plugin/invalidateByPeers';

jest.useFakeTimers();

describe('invalidateByPeers', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();
    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('invalidates an executor if a peer executor with the matching key is fulfilled', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(['yyy'])]);
    const executor2 = manager.getOrCreate('yyy');

    expect(executor1.isStale).toBe(false);

    executor2.resolve('bbb');

    expect(executor1.isStale).toBe(true);
  });

  test('invalidates an executor if a peer executor with the matching key is invalidated', () => {
    const executor2 = manager.getOrCreate('yyy', 'bbb');
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(['yyy'])]);

    expect(executor1.isStale).toBe(false);

    executor2.invalidate();

    expect(executor1.isStale).toBe(true);
  });

  test('invalidates an executor if a peer executor is created with a value', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(['yyy'])]);

    manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isStale).toBe(true);
  });
});

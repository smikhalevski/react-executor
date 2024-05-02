import { ExecutorManager } from '../../main';
import invalidateByPeers from '../../main/plugin/invalidateByPeers';

jest.useFakeTimers();

describe('invalidateByPeers', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('invalidates an executor if a peer executor with the matching key is fulfilled', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy');

    expect(executor1.isStale).toBe(false);

    executor2.resolve('bbb');

    expect(executor1.isStale).toBe(true);
  });

  test('invalidates an executor if a peer executor with the matching key is invalidated', () => {
    const executor2 = manager.getOrCreate('yyy', 'bbb');
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);

    expect(executor1.isStale).toBe(false);

    executor2.invalidate();

    expect(executor1.isStale).toBe(true);
  });

  test('invalidates an executor if a peer executor is created with an initial value', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidateByPeers(executor => executor.key === 'yyy')]);

    manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isStale).toBe(true);
  });
});

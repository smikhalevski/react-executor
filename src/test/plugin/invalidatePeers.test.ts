import { ExecutorManager } from '../../main';
import invalidatePeers from '../../main/plugin/invalidatePeers';

jest.useFakeTimers();

describe('invalidatePeers', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('invalidates a peer executor with the matching key if an executor is created with an initial value', () => {
    const executor1 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);

    const executor2 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(false);
  });

  test('does not invalidate a peer executor with the matching key if an executor is created without an initial value', () => {
    const executor1 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);

    const executor2 = manager.getOrCreate('xxx', undefined, [invalidatePeers(executor => executor.key === 'yyy')]);

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);
  });

  test('invalidates a peer executor with the matching key if an executor is fulfilled', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    executor1.resolve('ccc');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(true);
  });

  test('invalidates a peer executor with the matching key if an executor is invalidated', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    executor1.invalidate();

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(true);
  });

  test('do not invalidate peers after disposal', () => {
    const executor1 = manager.getOrCreate('xxx', 'aaa', [invalidatePeers(executor => executor.key === 'yyy')]);
    const executor2 = manager.getOrCreate('yyy', 'bbb');

    expect(executor1.isInvalidated).toBe(false);
    expect(executor2.isInvalidated).toBe(false);

    manager.dispose(executor1.key);
    executor1.invalidate();

    expect(executor1.isInvalidated).toBe(true);
    expect(executor2.isInvalidated).toBe(false);
  });
});

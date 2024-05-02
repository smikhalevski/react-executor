import { ExecutorManager } from '../main';
import { ExecutorImpl } from '../main/ExecutorImpl';

Date.now = jest.fn(() => 50);

describe('ExecutorManager', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();
    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  describe('constructor', () => {
    test('creates executors with the initial state', () => {
      const manager = new ExecutorManager({
        initialState: [
          {
            isFulfilled: true,
            isRejected: false,
            isStale: false,
            key: 'xxx',
            timestamp: 50,
            value: 111,
            reason: undefined,
          },
        ],
      });

      expect(manager.get('xxx')).toBeUndefined();

      const executor = manager.getOrCreate('xxx');

      expect(executor.value).toBe(111);
      expect(executor.timestamp).toBe(50);
    });

    test('creates executors with plugins', () => {
      const pluginMock = jest.fn(_executor => {});

      const manager = new ExecutorManager({
        plugins: [pluginMock],
      });

      const executor1 = manager.getOrCreate('xxx');
      const executor2 = manager.getOrCreate('yyy');

      expect(pluginMock).toHaveBeenCalledTimes(2);
      expect(pluginMock).toHaveBeenNthCalledWith(1, executor1);
      expect(pluginMock).toHaveBeenNthCalledWith(2, executor2);
    });
  });

  describe('getOrCreate', () => {
    test('creates the new executor', () => {
      const executor = manager.getOrCreate('aaa');

      expect(executor).toBeInstanceOf(ExecutorImpl);
      expect(executor.key).toBe('aaa');
      expect(executor.manager).toBe(manager);
      expect(executor.isPending).toBe(false);
      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
    });

    test('returns the existing executor', () => {
      expect(manager.getOrCreate('aaa')).toBe(manager.getOrCreate('aaa'));
    });

    test('applies the plugin only once', () => {
      const pluginMock = jest.fn(_executor => {});

      manager.getOrCreate('aaa', undefined, [pluginMock]);

      const executor = manager.getOrCreate('aaa', undefined, [pluginMock]);

      expect(executor.isPending).toBe(false);
      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();

      expect(pluginMock).toHaveBeenCalledTimes(1);
      expect(pluginMock.mock.calls[0][0]).toBe(executor);
    });

    test('applies the literal initial value only once', () => {
      manager.getOrCreate('aaa', 111);

      const executor = manager.getOrCreate('aaa', 222);

      expect(executor.isPending).toBe(false);
      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe(111);
      expect(executor.reason).toBeUndefined();

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 1 });
    });

    test('applies the initial task only once', async () => {
      const taskMock = jest.fn(() => 111);

      manager.getOrCreate('aaa', taskMock);

      const executor = manager.getOrCreate('aaa', taskMock);

      expect(executor.isPending).toBe(true);
      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();
      expect(taskMock).toHaveBeenCalledTimes(1);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'pending', target: executor, version: 1 });

      await expect(executor.toPromise()).resolves.toBe(111);

      expect(executor.isPending).toBe(false);
      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe(111);
      expect(executor.reason).toBeUndefined();

      expect(listenerMock).toHaveBeenCalledTimes(3);
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor, version: 2 });
    });

    test('does not apply initial value if executor was resolved from a plugin', () => {
      const taskMock = jest.fn(() => 111);

      const executor = manager.getOrCreate('aaa', taskMock, [
        executor => {
          executor.resolve(222);
        },
      ]);

      expect(executor.isPending).toBe(false);
      expect(executor.isFulfilled).toBe(true);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBe(222);
      expect(executor.reason).toBeUndefined();

      expect(taskMock).toHaveBeenCalledTimes(0);

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 1 });
    });

    test('does not apply initial value if a task execution was started form a plugin', async () => {
      const taskMock = jest.fn(() => 111);

      const executor = manager.getOrCreate('aaa', taskMock, [
        executor => {
          executor.execute(() => 222);
        },
      ]);

      expect(executor.isPending).toBe(true);
      expect(executor.isFulfilled).toBe(false);
      expect(executor.isRejected).toBe(false);
      expect(executor.value).toBeUndefined();
      expect(executor.reason).toBeUndefined();

      expect(taskMock).toHaveBeenCalledTimes(0);

      expect(listenerMock).toHaveBeenCalledTimes(1);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 1 });

      await executor.toPromise();

      expect(executor.value).toBe(222);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'fulfilled', target: executor, version: 2 });
    });

    test('events from the created executor are passed to the manager', async () => {
      const executor1 = manager.getOrCreate('aaa');
      const executor2 = manager.getOrCreate('bbb');

      executor1.resolve(111);
      executor2.resolve(222);

      expect(listenerMock).toHaveBeenCalledTimes(4);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor1, version: 0 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'configured', target: executor2, version: 0 });
      expect(listenerMock).toHaveBeenNthCalledWith(3, { type: 'fulfilled', target: executor1, version: 1 });
      expect(listenerMock).toHaveBeenNthCalledWith(4, { type: 'fulfilled', target: executor2, version: 1 });
    });

    test('throws is an object key is used without keySerializer', () => {
      expect(() => manager.getOrCreate(['aaa'])).toThrow();
    });

    test('creates an executor with an object key', () => {
      const manager = new ExecutorManager({
        keySerializer: JSON.stringify,
      });

      const expectedKey = ['aaa'];
      const executor1 = manager.getOrCreate(expectedKey);
      const executor2 = manager.getOrCreate(['aaa']);

      expect(executor1).toBe(executor2);
      expect(executor1.key).toBe(expectedKey);
      expect(manager.get(['aaa'])).toBe(executor1);
    });
  });

  describe('get', () => {
    test('return undefined if there is executor with the key', () => {
      expect(manager.get('aaa')).toBeUndefined();
    });

    test('returns the existing executor', () => {
      manager.getOrCreate('aaa');

      expect(manager.get('aaa')).toBeInstanceOf(ExecutorImpl);
      expect(manager.get('aaa')).toBe(manager.get('aaa'));
    });
  });

  describe('waitFor', () => {
    test('waits for an executor', async () => {
      await expect(manager.waitFor('aaa')).resolves.toBe(manager.getOrCreate('aaa'));
    });

    test('resolves with the existing executor', async () => {
      const executor = manager.getOrCreate('aaa');
      const executorPromise = manager.waitFor('aaa');

      await expect(executorPromise).resolves.toBe(executor);
    });
  });

  describe('dispose', () => {
    test('no-op is there is no executor with the key', () => {
      expect(manager.dispose('aaa')).toBe(false);
      expect(listenerMock).toHaveBeenCalledTimes(0);
    });

    test('no-op if executor exists and is active', () => {
      const executor = manager.getOrCreate('aaa');

      executor.activate();

      expect(manager.dispose('aaa')).toBe(false);
    });

    test('disposes non-active executor', () => {
      const executorListenerMock = jest.fn();
      const executor = manager.getOrCreate('aaa');

      executor.subscribe(executorListenerMock);

      expect(manager.dispose('aaa')).toBe(true);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(listenerMock).toHaveBeenNthCalledWith(1, { type: 'configured', target: executor, version: 0 });
      expect(listenerMock).toHaveBeenNthCalledWith(2, { type: 'disposed', target: executor, version: 0 });

      expect(executorListenerMock).toHaveBeenCalledTimes(1);
      expect(executorListenerMock).toHaveBeenNthCalledWith(1, { type: 'disposed', target: executor, version: 0 });

      executor.resolve(111);

      expect(listenerMock).toHaveBeenCalledTimes(2);
      expect(executorListenerMock).toHaveBeenCalledTimes(1);

      expect(executor).not.toBe(manager.getOrCreate('aaa'));
    });
  });

  describe('Symbol.iterator', () => {
    test('converts manager to an array of executors', () => {
      const executor1 = manager.getOrCreate('aaa');
      const executor2 = manager.getOrCreate('bbb');

      expect(Array.from(manager)).toEqual([executor1, executor2]);
    });
  });

  describe('toJSON', () => {
    test('returns an executor manager state', () => {
      manager.getOrCreate('xxx', 111);

      expect(manager.toJSON()).toEqual([
        {
          isFulfilled: true,
          isRejected: false,
          isStale: false,
          key: 'xxx',
          timestamp: 50,
          value: 111,
        },
      ]);
    });

    test('used by JSON.stringify', () => {
      manager.getOrCreate('xxx', 111);

      expect(JSON.stringify(manager)).toBe(
        '[{"key":"xxx","isFulfilled":true,"isRejected":false,"isStale":false,"value":111,"timestamp":50}]'
      );
    });
  });
});

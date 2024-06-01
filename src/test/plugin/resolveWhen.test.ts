import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import resolveWhen from '../../main/plugin/resolveWhen';

describe('resolveWhen', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('resolves the executor', () => {
    const pubSub = new PubSub<string>();

    const executor = manager.getOrCreate('xxx', undefined, [resolveWhen(pubSub)]);

    pubSub.publish('aaa');

    expect(executor.value).toBe('aaa');
  });
});

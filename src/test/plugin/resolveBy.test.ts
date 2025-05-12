import { describe, expect, test, beforeEach } from 'vitest';
import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import resolveBy from '../../main/plugin/resolveBy';

describe('resolveBy', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('resolves the executor', () => {
    const pubSub = new PubSub<string>();

    const executor = manager.getOrCreate('xxx', undefined, [resolveBy(pubSub)]);

    pubSub.publish('aaa');

    expect(executor.value).toBe('aaa');
  });
});

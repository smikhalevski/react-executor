import { beforeEach, expect, test } from 'vitest';
import { PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main/index.js';
import resolveBy from '../../main/plugin/resolveBy.js';

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

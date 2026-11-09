import { beforeEach, expect, test } from 'vitest';
import { ExecutorManager } from '../../main/index.ts';
import resolveBy from '../../main/plugin/resolveBy.ts';
import { PubSub } from '../../main/PubSub.ts';

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

test('unsubscribes from the observable when the executor is detached', () => {
  const pubSub = new PubSub<string>();

  manager.getOrCreate('xxx', undefined, [resolveBy(pubSub)]);

  manager.detach('xxx');

  expect(pubSub.listenerCount).toBe(0);
});

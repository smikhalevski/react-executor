import { describe, expect, test, beforeEach, vi } from 'vitest';
import { delay, PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import abortWhen from '../../main/plugin/abortWhen';
import { noop } from '../../main/utils';

vi.useFakeTimers();

describe('abortWhen', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('aborts the pending task', () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = vi.fn(_signal => delay(10_000));

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

    executor.execute(taskMock).catch(noop);

    pubSub.publish(true);

    vi.advanceTimersByTime(5_000);

    expect(taskMock.mock.calls[0][0].aborted).toBe(true);
  });

  test('aborts the executed task', () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = vi.fn();

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

    pubSub.publish(true);

    vi.runAllTimers();

    executor.execute(taskMock).catch(noop);

    expect(taskMock.mock.calls[0][0].aborted).toBe(true);
  });

  test('does not abort if the observable has pushed false before the timeout', async () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = vi.fn(_signal => delay(15_000, 'aaa'));

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub, { delay: 10_000 })]);

    executor.execute(taskMock).catch(noop);

    pubSub.publish(true);

    vi.advanceTimersByTime(5_000);

    pubSub.publish(false);

    vi.advanceTimersByTime(20_000);

    await expect(executor.getOrAwait()).resolves.toBe('aaa');

    expect(taskMock.mock.calls[0][0].aborted).toBe(false);
  });

  test('does not abort if true pushed twice', () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = vi.fn(_signal => delay(15_000, 'aaa'));

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

    executor.execute(taskMock).catch(noop);

    pubSub.publish(true);
    pubSub.publish(true);
    pubSub.publish(false);

    vi.advanceTimersToNextTimer();

    expect(taskMock.mock.calls[0][0].aborted).toBe(false);
  });
});

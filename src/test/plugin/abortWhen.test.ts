import { delay, PubSub } from 'parallel-universe';
import { ExecutorManager } from '../../main';
import abortWhen from '../../main/plugin/abortWhen';
import { noop } from '../../main/utils';

jest.useFakeTimers();

describe('abortWhen', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('aborts the pending task', () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn(_signal => delay(10_000));

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

    executor.execute(taskMock).catch(noop);

    pubSub.publish(false);

    jest.advanceTimersByTime(5_000);

    expect(taskMock.mock.calls[0][0].aborted).toBe(true);
  });

  test('aborts an executed task', () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn();

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub)]);

    pubSub.publish(false);

    jest.runAllTimers();

    executor.execute(taskMock).catch(noop);

    expect(taskMock.mock.calls[0][0].aborted).toBe(true);
  });

  test('does not abort if observable has pushed true before timeout', async () => {
    const pubSub = new PubSub<boolean>();

    const taskMock = jest.fn(_signal => delay(15_000, 'aaa'));

    const executor = manager.getOrCreate('xxx', undefined, [abortWhen(pubSub, 10_000)]);

    executor.execute(taskMock).catch(noop);

    pubSub.publish(false);

    jest.advanceTimersByTime(5_000);

    pubSub.publish(true);

    jest.advanceTimersByTime(20_000);

    await expect(executor.getOrAwait()).resolves.toBe('aaa');

    expect(taskMock.mock.calls[0][0].aborted).toBe(false);
  });
});

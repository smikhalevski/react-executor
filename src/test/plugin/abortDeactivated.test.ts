import { beforeEach, expect, Mock, test, vi } from 'vitest';
import { delay } from 'parallel-universe';
import { ExecutorEvent, ExecutorManager } from '../../main/index.js';
import abortDeactivated from '../../main/plugin/abortDeactivated.js';
import { AbortError } from '../../main/utils.js';

let listenerMock: Mock;
let manager: ExecutorManager;

beforeEach(() => {
  listenerMock = vi.fn();

  manager = new ExecutorManager();
  manager.subscribe(listenerMock);
});

test('aborts a deactivated executor', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [abortDeactivated({ delay: 0 })]);
  const deactivate = executor.activate();
  const taskMock = vi.fn(_signal => delay(100));
  const promise = executor.execute(taskMock);

  deactivate();

  await expect(promise).rejects.toEqual(AbortError('The executor was aborted'));

  expect(taskMock.mock.calls[0][0].aborted).toBe(true);

  expect(listenerMock).toHaveBeenCalledTimes(6);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'abortDeactivated', options: { delay: 0 } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'activated',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'pending',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'deactivated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'aborted',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
});

test('cancels abortion of an activated executor', async () => {
  const executor = manager.getOrCreate('xxx', undefined, [abortDeactivated({ delay: 0 })]);
  const deactivate = executor.activate();
  const taskMock = vi.fn(_signal => delay(100, 'aaa'));
  const promise = executor.execute(taskMock);

  deactivate();
  executor.activate();

  await expect(promise).resolves.toBe('aaa');

  expect(taskMock.mock.calls[0][0].aborted).toBe(false);

  expect(listenerMock).toHaveBeenCalledTimes(7);
  expect(listenerMock).toHaveBeenNthCalledWith(1, {
    type: 'plugin_configured',
    target: executor,
    version: 0,
    payload: { type: 'abortDeactivated', options: { delay: 0 } },
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(2, {
    type: 'attached',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(3, {
    type: 'activated',
    target: executor,
    version: 0,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(4, {
    type: 'pending',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(5, {
    type: 'deactivated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(6, {
    type: 'activated',
    target: executor,
    version: 1,
    payload: undefined,
  } satisfies ExecutorEvent);
  expect(listenerMock).toHaveBeenNthCalledWith(7, {
    type: 'fulfilled',
    target: executor,
    version: 2,
    payload: undefined,
  } satisfies ExecutorEvent);
});

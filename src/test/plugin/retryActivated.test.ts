import { ExecutorManager } from '../../main';
import retryActivated from '../../main/plugin/retryActivated';

jest.useFakeTimers();

describe('retryActivated', () => {
  let listenerMock: jest.Mock;
  let manager: ExecutorManager;

  beforeEach(() => {
    listenerMock = jest.fn();

    manager = new ExecutorManager();
    manager.subscribe(listenerMock);
  });

  test('retries an activated executor', async () => {
    const taskMock = jest.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryActivated()]);

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);

    executor.activate();

    expect(executor.isPending).toBe(true);
  });

  test('does not retry if executor is not stale yet', async () => {
    const taskMock = jest.fn();
    const executor = manager.getOrCreate('xxx', taskMock, [retryActivated({ staleDelay: 5_000 })]);

    await executor.getOrAwait();

    const deactivate = executor.activate();

    expect(executor.isPending).toBe(false);

    deactivate();

    jest.setSystemTime(Date.now() + 5_000);

    executor.activate();

    expect(executor.isPending).toBe(true);
  });
});

import { fireEvent } from '@testing-library/react';
import { ExecutorManager } from '../../main';
import retryFocused from '../../main/plugin/retryFocused';

describe('retryFocused', () => {
  let manager: ExecutorManager;

  beforeEach(() => {
    manager = new ExecutorManager();
  });

  test('retries an invalidated active executor', async () => {
    const taskMock = jest.fn().mockReturnValueOnce('aaa').mockReturnValueOnce('bbb');
    const executor = manager.getOrCreate('xxx', taskMock, [retryFocused()]);

    executor.activate();

    await executor.getOrAwait();

    expect(executor.value).toBe('aaa');

    fireEvent(window, new Event('visibilitychange'));

    expect(executor.isPending).toBe(true);
    expect(executor.value).toBe('aaa');

    await executor.getOrAwait();

    expect(executor.isPending).toBe(false);
    expect(executor.value).toBe('bbb');
  });
});

import { enableSSRHydration, ExecutorManager } from '../main';

describe('enableSSRHydration', () => {
  beforeEach(() => {
    window.__REACT_EXECUTOR_SSR_STATE__ = undefined;
  });

  test('hydrates an executor that is added after', () => {
    const manager = new ExecutorManager();

    enableSSRHydration(manager);

    window.__REACT_EXECUTOR_SSR_STATE__!.push(
      JSON.stringify({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      })
    );

    const executor = manager.getOrCreate('xxx');

    expect(executor.value).toBe(111);
    expect(executor.settledAt).toBe(50);
  });

  test('hydrates an executor that was added before', () => {
    window.__REACT_EXECUTOR_SSR_STATE__ = [
      JSON.stringify({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      }),
    ];

    const manager = new ExecutorManager();

    enableSSRHydration(manager);

    const executor = manager.getOrCreate('xxx');

    expect(executor.value).toBe(111);
    expect(executor.settledAt).toBe(50);
  });

  test('hydrates executors that are added before and after', () => {
    window.__REACT_EXECUTOR_SSR_STATE__ = [
      JSON.stringify({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      }),
    ];

    const manager = new ExecutorManager();

    enableSSRHydration(manager);

    window.__REACT_EXECUTOR_SSR_STATE__!.push(
      JSON.stringify({
        key: 'yyy',
        isFulfilled: true,
        value: 222,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      })
    );

    const executor1 = manager.getOrCreate('xxx');
    const executor2 = manager.getOrCreate('yyy');

    expect(executor1.value).toBe(111);
    expect(executor2.value).toBe(222);
  });

  test('throws if hydration is enabled twice', () => {
    const manager = new ExecutorManager();

    enableSSRHydration(manager);

    expect(() => enableSSRHydration(manager)).toThrow();
  });

  test('uses custom parser', () => {
    const manager = new ExecutorManager();
    const stateParserMock = jest.fn(JSON.parse);

    enableSSRHydration(manager, { stateParser: stateParserMock });

    window.__REACT_EXECUTOR_SSR_STATE__!.push(
      JSON.stringify({
        key: 'xxx',
        isFulfilled: true,
        value: 111,
        reason: undefined,
        settledAt: 50,
        invalidatedAt: 0,
        annotations: {},
      })
    );

    const executor = manager.getOrCreate('xxx');

    expect(executor.value).toBe(111);

    expect(stateParserMock).toHaveBeenCalledTimes(1);
    expect(stateParserMock).toHaveBeenNthCalledWith(
      1,
      '{"key":"xxx","isFulfilled":true,"value":111,"settledAt":50,"invalidatedAt":0,"annotations":{}}'
    );
  });
});

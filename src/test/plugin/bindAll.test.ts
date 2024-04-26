import { ExecutorManager } from '../../main';
import bindAll from '../../main/plugin/bindAll';

describe('bindAll', () => {
  test('binds methods to an executor instance', async () => {
    const executor = new ExecutorManager().getOrCreate('xxx', undefined, [bindAll()]);

    (0, executor.resolve)('aaa');

    expect(executor.value).toBe('aaa');
  });
});

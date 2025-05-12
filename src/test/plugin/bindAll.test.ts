import { describe, expect, test } from 'vitest';
import { ExecutorManager } from '../../main/index.js';
import bindAll from '../../main/plugin/bindAll.js';

describe('bindAll', () => {
  test('binds methods to an executor instance', () => {
    const executor = new ExecutorManager().getOrCreate('xxx', undefined, [bindAll()]);

    (0, executor.resolve)('aaa');

    expect(executor.value).toBe('aaa');
  });
});

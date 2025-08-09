import { expect, test, vi } from 'vitest';
import { delay } from 'parallel-universe';
import { Writable } from 'stream';
import { NodeSSRExecutorManager } from '../../../main/ssr/node/index.js';

Date.now = () => 50;

test('sends hydration chunk after the content chunk', async () => {
  const writeMock = vi.fn();

  const writable = new Writable({
    write(chunk, _encoding, callback) {
      writeMock(chunk.toString());
      callback();
    },
  });

  const manager = new NodeSSRExecutorManager();

  manager.getOrCreate('xxx', 111);

  writable.write('aaa</script>');

  manager.pipe(writable);

  await delay(200);

  expect(writeMock).toHaveBeenCalledTimes(2);
  expect(writeMock).toHaveBeenNthCalledWith(1, 'aaa</script>');
  expect(writeMock).toHaveBeenNthCalledWith(
    2,
    '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);</script>'
  );
});

test('does not send hydration chunk if nothing has changed', async () => {
  const writeMock = vi.fn();

  const writable = new Writable({
    write(chunk, _encoding, callback) {
      writeMock(chunk.toString());
      callback();
    },
  });

  const manager = new NodeSSRExecutorManager();

  manager.getOrCreate('xxx', 111);

  writable.write('aaa</script>');
  manager.pipe(writable);
  writable.write('bbb');
  writable.write('ccc</script>');

  await delay(200);

  expect(writeMock).toHaveBeenCalledTimes(4);
  expect(writeMock).toHaveBeenNthCalledWith(1, 'aaa</script>');
  expect(writeMock).toHaveBeenNthCalledWith(
    2,
    '<script>(window.__REACT_EXECUTOR_SSR_STATE__=window.__REACT_EXECUTOR_SSR_STATE__||[]).push("\\"xxx\\"","{\\"isFulfilled\\":true,\\"value\\":111,\\"annotations\\":{},\\"settledAt\\":50,\\"invalidatedAt\\":0}");var e=document.currentScript;e&&e.parentNode.removeChild(e);</script>'
  );
  expect(writeMock).toHaveBeenNthCalledWith(3, 'bbb');
  expect(writeMock).toHaveBeenNthCalledWith(4, 'ccc</script>');
});

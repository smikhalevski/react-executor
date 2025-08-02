import { expect, test, vi } from 'vitest';
import { PubSub } from 'parallel-universe';

import { negate } from '../main/utils.js';

test('inverses published value', () => {
  const listenerMock = vi.fn();

  const pubSub1 = new PubSub<boolean>();
  const pubSub2 = negate(pubSub1);

  pubSub2.subscribe(listenerMock);

  pubSub1.publish(true);
  pubSub1.publish(false);

  expect(listenerMock).toHaveBeenCalledTimes(2);
  expect(listenerMock).toHaveBeenNthCalledWith(1, false);
  expect(listenerMock).toHaveBeenNthCalledWith(2, true);
});

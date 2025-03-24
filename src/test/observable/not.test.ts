import { PubSub } from 'parallel-universe';
import not from '../../main/observable/not';

describe('not', () => {
  test('inverses published value', () => {
    const listenerMock = jest.fn();

    const pubSub = new PubSub<boolean>();

    const notPubSub = not(pubSub);

    notPubSub.subscribe(listenerMock);

    pubSub.publish(true);
    pubSub.publish(false);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(listenerMock).toHaveBeenNthCalledWith(1, false);
    expect(listenerMock).toHaveBeenNthCalledWith(2, true);
  });
});

import { isPromiseLike, rethrowAsync } from './utils.ts';

export type Listener<TMessage> = (message: TMessage) => unknown;

/**
 * Publish–subscribe implementation that delivers each message to all listeners, even if some of them throw.
 *
 * Listeners subscribed or unsubscribed during {@link publish} don't affect the delivery of the current message: a
 * listener unsubscribed by an earlier listener still receives it.
 *
 * If a listener publishes during {@link publish}, the nested message is delivered to all listeners before the remaining
 * listeners receive the current one.
 *
 * @template TMessage The published message.
 */
export class PubSub<TMessage = void> {
  /**
   * Unique listeners in the subscription order. Mutated in place, or replaced with a mutated copy while
   * a {@link publish} is iterating over it.
   */
  _listeners: Listener<TMessage>[] = [];

  /**
   * The number of ongoing {@link publish} calls iterating over {@link _listeners}.
   */
  _iteratorCount = 0;

  /**
   * The number of subscribed listeners.
   */
  get listenerCount(): number {
    return this._listeners.length;
  }

  /**
   * Synchronously invokes listeners with the published message.
   *
   * Errors thrown by listeners, and rejections of promises they return, are rethrown asynchronously.
   */
  publish(message: TMessage): void {
    const listeners = this._listeners;

    this._iteratorCount++;

    for (const listener of listeners) {
      try {
        const result = listener(message);

        if (isPromiseLike(result)) {
          result.then(undefined, rethrowAsync);
        }
      } catch (error) {
        rethrowAsync(error);
      }
    }

    // If listeners were copied during publish, the copy isn't being iterated over
    if (this._listeners === listeners) {
      this._iteratorCount--;
    }
  }

  /**
   * Adds a listener that receives all messages published via {@link publish}. No-op if the listener is already
   * subscribed.
   *
   * Subscriptions aren't counted: unsubscribing a listener removes it regardless of how many times it was subscribed.
   *
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: Listener<TMessage>): () => void {
    if (!this._listeners.includes(listener)) {
      this._getMutableListeners().push(listener);
    }

    return () => this.unsubscribe(listener);
  }

  /**
   * Removes a listener. No-op if the listener isn't subscribed.
   */
  unsubscribe(listener: Listener<TMessage>): void {
    const index = this._listeners.indexOf(listener);

    if (index !== -1) {
      this._getMutableListeners().splice(index, 1);
    }
  }

  /**
   * Unsubscribes all listeners.
   */
  unsubscribeAll(): void {
    if (this._iteratorCount === 0) {
      this._listeners.length = 0;
    } else {
      this._listeners = [];
      this._iteratorCount = 0;
    }
  }

  /**
   * Returns listeners that are safe to mutate: copies them if a {@link publish} is iterating over them.
   */
  _getMutableListeners(): Listener<TMessage>[] {
    if (this._iteratorCount !== 0) {
      this._listeners = this._listeners.slice(0);
      this._iteratorCount = 0;
    }

    return this._listeners;
  }
}

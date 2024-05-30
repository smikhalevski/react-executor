import { SSRExecutorManager, SSRExecutorManagerOptions } from './SSRExecutorManager';

/**
 * The streaming executor manager that can be used as a transformer for
 * [Web Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API). It enqueues executor hydration chunks
 * into the after each chunk from the read side.
 */
export class ReadableSSRExecutorManager extends SSRExecutorManager implements ReadableWritablePair {
  readonly readable: ReadableStream;
  readonly writable: WritableStream;

  /**
   * Creates a new {@link ReadableSSRExecutorManager} instance.
   *
   * @param options Additional options.
   */
  constructor(options?: SSRExecutorManagerOptions) {
    super(options);

    const transformer = new TransformStream({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);

        const hydrationChunk = this.nextHydrationChunk();

        if (hydrationChunk !== '') {
          controller.enqueue(hydrationChunk);
        }
      },
    });

    this.readable = transformer.readable;
    this.writable = transformer.writable;
  }
}

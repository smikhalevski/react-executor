import { SSRExecutorManager, SSRExecutorManagerOptions } from './SSRExecutorManager.js';
import { enqueueHydrationChunk, flushHydrationChunk } from './utils.js';

/**
 * The streaming executor manager that can be used as a transformer for
 * [Web Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API). It enqueues executor hydration chunks
 * into the after each chunk from the read side.
 */
export class WebSSRExecutorManager extends SSRExecutorManager {
  readonly stream: ReadableWritablePair<Uint8Array, Uint8Array>;

  /**
   * Creates a new {@link WebSSRExecutorManager} instance.
   *
   * @param options Additional options.
   */
  constructor(options?: SSRExecutorManagerOptions) {
    super(options);

    let prevHydrationChunk: Uint8Array | null = null;

    this.stream = new TransformStream({
      transform: (reactChunk, controller) => {
        prevHydrationChunk = enqueueHydrationChunk(reactChunk, prevHydrationChunk, this.nextHydrationChunk(), chunk =>
          controller.enqueue(chunk)
        );
      },

      flush: controller => {
        flushHydrationChunk(prevHydrationChunk, this.nextHydrationChunk(), chunk => controller.enqueue(chunk));
      },
    });
  }
}

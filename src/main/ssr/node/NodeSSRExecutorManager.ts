import { SSRExecutorManager, SSRExecutorManagerOptions } from '../SSRExecutorManager.js';
import { Transform } from 'node:stream';
import { enqueueHydrationChunk, flushHydrationChunk } from '../utils.js';

/**
 * Streaming executor manager for NodeJS environment.
 */
export class NodeSSRExecutorManager extends SSRExecutorManager {
  readonly stream: NodeJS.ReadWriteStream;

  /**
   * Creates a new {@link NodeSSRExecutorManager} instance.
   *
   * @param options Additional options.
   */
  constructor(options: SSRExecutorManagerOptions = {}) {
    super(options);

    let prevHydrationChunk: Uint8Array | null = null;

    this.stream = new Transform({
      transform: (reactChunk, _encoding, callback) => {
        prevHydrationChunk = enqueueHydrationChunk(reactChunk, prevHydrationChunk, this.nextHydrationChunk(), chunk =>
          callback(null, chunk)
        );
      },

      flush: callback => {
        flushHydrationChunk(prevHydrationChunk, this.nextHydrationChunk(), chunk => callback(null, chunk));
      },
    });
  }
}

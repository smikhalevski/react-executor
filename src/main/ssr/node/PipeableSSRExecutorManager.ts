import { Writable } from 'stream';
import { SSRExecutorManager, SSRExecutorManagerOptions } from '../SSRExecutorManager';

/**
 * Streaming executor manager for NodeJS environment.
 */
export class PipeableSSRExecutorManager extends SSRExecutorManager {
  /**
   * The stream that includes both React rendering chunks and executor hydration chunks.
   */
  readonly stream: NodeJS.WritableStream;

  /**
   * Creates a new {@link PipeableSSRExecutorManager} instance.
   *
   * @param stream The output stream to which both React chunks and executor hydration chunks are written.
   * @param options Additional options.
   */
  constructor(stream: NodeJS.WritableStream, options?: SSRExecutorManagerOptions) {
    super(options);

    this.stream = new Writable({
      write: (chunk, encoding, callback) => {
        stream.write(chunk, encoding, error => {
          if (error) {
            callback(error);
            return;
          }

          const hydrationChunk = this.nextHydrationChunk();

          if (hydrationChunk !== '') {
            stream.write(hydrationChunk, callback);
            return;
          }

          callback();
        });
      },

      final: callback => {
        stream.end(callback);
      },
    });
  }
}

import { injectHydrationChunk } from './injectHydrationChunk.js';

export function createHydrationStream(nextHydrationChunk: () => Uint8Array | string): TransformStream {
  return new TransformStream({
    transform(reactChunk, controller) {
      controller.enqueue(injectHydrationChunk(reactChunk, nextHydrationChunk));
    },
  });
}

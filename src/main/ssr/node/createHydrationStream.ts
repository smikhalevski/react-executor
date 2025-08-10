import { Transform } from 'node:stream';
import { injectHydrationChunk } from '../injectHydrationChunk.js';

export function createHydrationStream(nextHydrationChunk: () => Uint8Array | string): Transform {
  return new Transform({
    transform(reactChunk, _encoding, callback) {
      callback(null, injectHydrationChunk(reactChunk, nextHydrationChunk));
    },
  });
}

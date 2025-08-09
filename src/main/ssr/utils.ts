export function enqueueHydrationChunk(
  reactChunk: Uint8Array,
  prevHydrationChunk: Uint8Array | null,
  nextHydrationChunk: string,
  enqueue: (chunk: Uint8Array) => void
): Uint8Array | null {
  const hydrationChunk = concatHydrationChunks(prevHydrationChunk, nextHydrationChunk);

  if (hydrationChunk === null) {
    // No hydration chunk
    enqueue(reactChunk);
    return null;
  }

  const nextChunk = insertHydrationChunk(reactChunk, hydrationChunk);

  if (nextChunk === null) {
    // No insertion point, keep hydration chunk
    enqueue(reactChunk);
    return hydrationChunk;
  }

  // Successfully inserted hydration chunk
  enqueue(nextChunk);
  return null;
}

export function flushHydrationChunk(
  prevChunk: Uint8Array | null,
  nextChunk: string,
  flush: (chunk: Uint8Array) => void
) {
  const hydrationChunk = concatHydrationChunks(prevChunk, nextChunk);

  if (hydrationChunk === null) {
    return;
  }

  flush(hydrationChunk);
}

const textEncoder = new TextEncoder();

export function getInsertionIndex(chunk: Uint8Array): number {
  for (let i = chunk.length, j = i; i-- > 1; ) {
    if (chunk[i] === 62 /* > */) {
      j = i + 1;
    }
    if (chunk[i - 1] === 60 /* < */ && chunk[i] === 47 /* / */) {
      return j;
    }
  }
  return -1;
}

export function insertHydrationChunk(reactChunk: Uint8Array, hydrationChunk: Uint8Array): Uint8Array | null {
  const index = getInsertionIndex(reactChunk);

  if (index === -1) {
    return null;
  }

  const chunk = new Uint8Array(reactChunk.length + hydrationChunk.length);

  if (index === reactChunk.length) {
    chunk.set(reactChunk, 0);
    chunk.set(hydrationChunk, index);
  } else {
    chunk.set(reactChunk.subarray(0, index), 0);
    chunk.set(hydrationChunk, index);
    chunk.set(reactChunk.subarray(index), index + hydrationChunk.length);
  }

  return chunk;
}

export function concatHydrationChunks(prevChunk: Uint8Array | null, nextChunk: string): Uint8Array | null {
  if (nextChunk === '') {
    return prevChunk;
  }

  if (prevChunk === null) {
    return textEncoder.encode(nextChunk);
  }

  const encodedChunk = textEncoder.encode(nextChunk);

  const chunk = new Uint8Array(prevChunk.length + encodedChunk.length);

  chunk.set(prevChunk, 0);
  chunk.set(encodedChunk, prevChunk.length);

  return chunk;
}

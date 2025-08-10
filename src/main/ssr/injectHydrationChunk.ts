export function injectHydrationChunk(
  reactChunk: Uint8Array | string,
  nextHydrationChunk: () => Uint8Array | string
): Uint8Array {
  reactChunk = toUint8Array(reactChunk);

  const index = getInjectionIndex(reactChunk);

  if (index === -1) {
    return reactChunk;
  }

  const hydrationChunk = toUint8Array(nextHydrationChunk());

  if (hydrationChunk.length === 0) {
    return reactChunk;
  }

  const chunk = new Uint8Array(reactChunk.length + hydrationChunk.length);

  if (index === 0) {
    chunk.set(hydrationChunk, 0);
    chunk.set(reactChunk, hydrationChunk.length);
  } else if (index === reactChunk.length) {
    chunk.set(reactChunk, 0);
    chunk.set(hydrationChunk, index);
  } else {
    chunk.set(reactChunk.subarray(0, index), 0);
    chunk.set(hydrationChunk, index);
    chunk.set(reactChunk.subarray(index), index + hydrationChunk.length);
  }

  return chunk;
}

function toUint8Array(source: Uint8Array | string): Uint8Array {
  return source instanceof Uint8Array ? source : source.length === 0 ? emptyArray : textEncoder.encode(source);
}

const textEncoder = new TextEncoder();
const emptyArray = new Uint8Array(0);
const HEAD = toUint8Array('</head>');
const BODY = toUint8Array('</body>');
const SCRIPT = toUint8Array('<script>');

function getInjectionIndex(chunk: Uint8Array): number {
  for (let i = chunk.length; i-- > SCRIPT.length; ) {
    if (chunk[i] !== 62 /* > */) {
      continue;
    }
    if (isEqualSubarray(chunk, i + 1 - HEAD.length, HEAD) || isEqualSubarray(chunk, i + 1 - BODY.length, BODY)) {
      return i + 1 - BODY.length;
    }
    if (isEqualSubarray(chunk, i + 1 - SCRIPT.length, SCRIPT)) {
      return i + 1 - SCRIPT.length;
    }
  }
  return -1;
}

function isEqualSubarray(a: Uint8Array, startIndex: number, b: Uint8Array): boolean {
  if (startIndex < 0 || a.length < startIndex + b.length) {
    return false;
  }

  for (let i = 0; i < b.length; ++i) {
    if (a[startIndex + i] !== b[i]) {
      return false;
    }
  }

  return true;
}

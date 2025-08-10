/**
 * Tooling for SSR implementation that supports executor hydration on the client.
 *
 * ```ts
 * import { createHydrationStream } from 'react-executor/ssr';
 * ```
 *
 * @module ssr
 */

export { SSRExecutorManager } from './SSRExecutorManager.js';
export { createHydrationStream } from './createHydrationStream.js';
export { injectHydrationChunk } from './injectHydrationChunk.js';

export type { SSRExecutorManagerOptions } from './SSRExecutorManager.js';

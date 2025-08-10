/**
 * NodeJS-specific tooling for SSR implementation that supports executor hydration on the client.
 *
 * ```ts
 * import { createHydrationStream } from 'react-executor/ssr/node';
 * ```
 *
 * @module ssr/node
 */

export { createHydrationStream } from './createHydrationStream.js';

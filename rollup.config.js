const typescript = require('@rollup/plugin-typescript');

module.exports = {
  input: [
    './src/main/index.ts',
    './src/main/plugin/abortDeactivated.ts',
    './src/main/plugin/bindAll.ts',
    './src/main/plugin/disposeDeactivated.ts',
    './src/main/plugin/invalidateAfter.ts',
    './src/main/plugin/invalidateByPeers.ts',
    './src/main/plugin/invalidatePeers.ts',
    './src/main/plugin/retryFocused.ts',
    './src/main/plugin/retryFulfilled.ts',
    './src/main/plugin/retryRejected.ts',
    './src/main/plugin/retryStale.ts',
    './src/main/plugin/synchronizeStorage.ts',
  ],
  output: [
    { format: 'cjs', entryFileNames: '[name].js', dir: './lib', preserveModules: true },
    { format: 'es', entryFileNames: '[name].mjs', dir: './lib', preserveModules: true },
  ],
  plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
  external: ['react', 'parallel-universe'],
};

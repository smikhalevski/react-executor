const replace = require('@rollup/plugin-replace');
const nodeResolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

module.exports = [
  {
    input: './src/server.tsx',
    output: { format: 'cjs', dir: './build' },
    preserveSymlinks: true,
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      replace({
        values: {
          'process.env.NODE_ENV': JSON.stringify('development'),
        },
        preventAssignment: true,
      }),
    ],
  },
  {
    input: './src/client.tsx',
    output: { format: 'iife', dir: './build' },
    preserveSymlinks: true,
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      replace({
        values: {
          'process.env.NODE_ENV': JSON.stringify('development'),
        },
        preventAssignment: true,
      }),
    ],
  },
];

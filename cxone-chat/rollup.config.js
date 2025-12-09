import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

// Use empty string for production (same-origin), localhost for dev
const backendUrl = process.env.BACKEND_URL !== undefined
  ? process.env.BACKEND_URL
  : 'http://localhost:3002';

const envReplace = replace({
  preventAssignment: true,
  values: {
    'process.env.BACKEND_URL': JSON.stringify(backendUrl),
  },
});

export default [
  // Main build (IIFE for browser)
  {
    input: 'src/cxone-chat.ts',
    output: {
      file: 'dist/cxone-chat.js',
      format: 'iife',
      name: 'CXOneChatModule',
      sourcemap: true,
      footer: 'window.CXOneChat = CXOneChatModule.CXOneChat || CXOneChatModule.default || CXOneChatModule;',
    },
    plugins: [
      envReplace,
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist/types',
      }),
    ],
  },
  // Minified build
  {
    input: 'src/cxone-chat.ts',
    output: {
      file: 'dist/cxone-chat.min.js',
      format: 'iife',
      name: 'CXOneChatModule',
      sourcemap: true,
      footer: 'window.CXOneChat = CXOneChatModule.CXOneChat || CXOneChatModule.default || CXOneChatModule;',
    },
    plugins: [
      envReplace,
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      terser(),
    ],
  },
];

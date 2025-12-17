import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  // IIFE build (for script tag)
  {
    input: join(__dirname, 'src/cxone-chat.ts'),
    output: {
      file: join(__dirname, '../dist/cxone-chat.js'),
      format: 'iife',
      name: 'CXOneChatModule',
      sourcemap: true,
      exports: 'named',
      footer: 'window.CXOneChat = CXOneChatModule.CXOneChat || CXOneChatModule.default || CXOneChatModule;',
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: join(__dirname, 'tsconfig.json'),
        declaration: true,
        declarationDir: join(__dirname, '../dist/types'),
      }),
    ],
  },
  // IIFE minified (wrapper only, for concatenation)
  {
    input: join(__dirname, 'src/cxone-chat.ts'),
    output: {
      file: join(__dirname, '../dist/cxone-chat-wrapper.min.js'),
      format: 'iife',
      name: 'CXOneChatModule',
      sourcemap: true,
      exports: 'named',
      footer: 'window.CXOneChat = CXOneChatModule.CXOneChat || CXOneChatModule.default || CXOneChatModule;',
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: join(__dirname, 'tsconfig.json'),
        declaration: false,
        declarationDir: null,
      }),
      terser(),
    ],
  },
  // ESM build (wrapper only, for concatenation)
  {
    input: join(__dirname, 'src/cxone-chat.ts'),
    output: {
      file: join(__dirname, '../dist/cxone-chat-wrapper.esm.js'),
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: join(__dirname, 'tsconfig.json'),
        declaration: false,
        declarationDir: null,
      }),
    ],
  },
  // ESM minified (wrapper only, for concatenation)
  {
    input: join(__dirname, 'src/cxone-chat.ts'),
    output: {
      file: join(__dirname, '../dist/cxone-chat-wrapper.esm.min.js'),
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: join(__dirname, 'tsconfig.json'),
        declaration: false,
        declarationDir: null,
      }),
      terser(),
    ],
  },
];

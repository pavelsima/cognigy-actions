#!/usr/bin/env node

/**
 * Build script for CXone Chat
 *
 * Builds webchat and cxone-chat wrapper, then concatenates them into bundles.
 * Outputs both IIFE (for script tag) and ESM (for import) formats.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const monorepoRoot = join(rootDir, '..');
const wrapperDir = join(rootDir, 'wrapper');
const webchatDir = join(rootDir, 'webchat');
const distDir = join(rootDir, 'dist');

// Paths to binaries (webpack in webchat's node_modules, rollup in monorepo root)
const webpackBin = join(webchatDir, 'node_modules', '.bin', 'webpack');
const rollupBin = join(monorepoRoot, 'node_modules', '.bin', 'rollup');

function run(cmd, cwd = rootDir) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function build() {
  console.log('🔨 Building CXone Chat...\n');

  // Step 1: Install webchat dependencies and build (both UMD and ESM)
  console.log('📦 Step 1: Installing webchat dependencies...');
  run('npm install', webchatDir);
  console.log('📦 Step 1: Building webchat (UMD)...');
  run(`"${webpackBin}" --config webpack.production.js`, webchatDir);
  console.log('📦 Step 1: Building webchat (ESM)...');
  run(`"${webpackBin}" --config webpack.es.js`, webchatDir);

  // Step 2: Build cxone-chat wrapper (IIFE and ESM)
  console.log('\n📦 Step 2: Building cxone-chat wrapper...');
  run(`"${rollupBin}" -c ${join(wrapperDir, 'rollup.config.js')}`, wrapperDir);

  // Step 3: Create combined bundles
  console.log('\n📦 Step 3: Creating combined bundles...');
  ensureDir(distDir);

  // Read webchat builds
  const webchatIife = readFileSync(join(webchatDir, 'dist', 'webchat.js'), 'utf-8');
  const webchatEsm = readFileSync(join(webchatDir, 'dist', 'webchat.esm.js'), 'utf-8');

  // Read wrapper builds
  const wrapperIife = readFileSync(join(distDir, 'cxone-chat-wrapper.min.js'), 'utf-8');
  const wrapperIifeUnminified = readFileSync(join(distDir, 'cxone-chat.js'), 'utf-8');
  const wrapperEsm = readFileSync(join(distDir, 'cxone-chat-wrapper.esm.js'), 'utf-8');
  const wrapperEsmMin = readFileSync(join(distDir, 'cxone-chat-wrapper.esm.min.js'), 'utf-8');

  // IIFE combined (for <script> tag)
  const iifeBundle = `${webchatIife}\n\n/* CXone Chat Wrapper */\n${wrapperIife}`;
  writeFileSync(join(distDir, 'cxone-chat.min.js'), iifeBundle);
  console.log('✅ Created dist/cxone-chat.min.js (IIFE, minified)');

  // IIFE unminified (for debugging)
  const iifeBundleUnminified = `${webchatIife}\n\n/* CXone Chat Wrapper */\n${wrapperIifeUnminified}`;
  writeFileSync(join(distDir, 'cxone-chat.bundle.js'), iifeBundleUnminified);
  console.log('✅ Created dist/cxone-chat.bundle.js (IIFE, unminified)');

  // ESM combined (for import)
  const esmBundle = `${webchatEsm}\n\n/* CXone Chat Wrapper */\n${wrapperEsm}`;
  writeFileSync(join(distDir, 'cxone-chat.esm.js'), esmBundle);
  console.log('✅ Created dist/cxone-chat.esm.js (ESM)');

  // ESM minified (for production import)
  const esmBundleMin = `${webchatEsm}\n\n/* CXone Chat Wrapper */\n${wrapperEsmMin}`;
  writeFileSync(join(distDir, 'cxone-chat.esm.min.js'), esmBundleMin);
  console.log('✅ Created dist/cxone-chat.esm.min.js (ESM, minified)');

  console.log('\n✨ Build complete!\n');
  console.log('Output files:');
  console.log('  IIFE (script tag):');
  console.log('    - dist/cxone-chat.min.js (minified)');
  console.log('    - dist/cxone-chat.bundle.js (unminified)');
  console.log('  ESM (import):');
  console.log('    - dist/cxone-chat.esm.js');
  console.log('    - dist/cxone-chat.esm.min.js (minified)');
  console.log('  Wrapper only:');
  console.log('    - dist/cxone-chat.js');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

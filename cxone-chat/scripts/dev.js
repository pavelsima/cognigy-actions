#!/usr/bin/env node

/**
 * Dev script for CXone Chat
 *
 * Watches both webchat and wrapper for changes and rebuilds combined bundle.
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const wrapperDir = join(rootDir, 'wrapper');
const webchatDir = join(rootDir, 'webchat');
const distDir = join(rootDir, 'dist');

function run(cmd, cwd = rootDir) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function buildCombinedBundle() {
  try {
    const webchatJsPath = join(webchatDir, 'dist', 'webchat.js');
    const wrapperJsPath = join(distDir, 'cxone-chat.js');

    if (!existsSync(webchatJsPath) || !existsSync(wrapperJsPath)) {
      console.log('⏳ Waiting for builds...');
      return;
    }

    const webchatJs = readFileSync(webchatJsPath, 'utf-8');
    const wrapperJs = readFileSync(wrapperJsPath, 'utf-8');

    // IIFE bundle
    const combined = `${webchatJs}\n\n/* CXone Chat Wrapper */\n${wrapperJs}`;
    writeFileSync(join(distDir, 'cxone-chat.min.js'), combined);
    writeFileSync(join(distDir, 'cxone-chat.bundle.js'), combined);

    // ESM bundle (if webchat.esm.js exists)
    const webchatEsmPath = join(webchatDir, 'dist', 'webchat.esm.js');
    const wrapperEsmPath = join(distDir, 'cxone-chat-wrapper.esm.js');
    if (existsSync(webchatEsmPath) && existsSync(wrapperEsmPath)) {
      const webchatEsm = readFileSync(webchatEsmPath, 'utf-8');
      const wrapperEsm = readFileSync(wrapperEsmPath, 'utf-8');
      const esmBundle = `${webchatEsm}\n\n/* CXone Chat Wrapper */\n${wrapperEsm}`;
      writeFileSync(join(distDir, 'cxone-chat.esm.js'), esmBundle);
    }

    console.log('✅ Combined bundle updated');
  } catch (err) {
    console.error('❌ Failed to create combined bundle:', err.message);
  }
}

async function dev() {
  console.log('🔨 Starting CXone Chat dev mode...\n');
  console.log('📂 Watching webchat + wrapper for changes\n');

  ensureDir(distDir);

  // Initial builds
  const webchatDistPath = join(webchatDir, 'dist', 'webchat.js');
  if (!existsSync(webchatDistPath)) {
    console.log('📦 Building webchat (first time)...');
    run('npm run build', webchatDir);
  }

  console.log('📦 Building wrapper...');
  run(`npx rollup -c ${join(wrapperDir, 'rollup.config.js')}`, rootDir);

  // Initial combined bundle
  buildCombinedBundle();

  console.log('\n👀 Starting watch mode...\n');

  // Watch webchat
  const webchatWatch = spawn('npm', ['run', 'watch'], {
    cwd: webchatDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  webchatWatch.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.trim()) {
      console.log(`[webchat] ${output.trim()}`);
    }
    // Webpack outputs "compiled successfully" or similar when done
    if (output.includes('compiled') || output.includes('built') || output.includes('emitted')) {
      setTimeout(buildCombinedBundle, 200);
    }
  });

  webchatWatch.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.trim() && !output.includes('webpack')) {
      console.error(`[webchat] ${output.trim()}`);
    }
  });

  // Watch wrapper
  const rollupWatch = spawn('npx', [
    'rollup',
    '-c', join(wrapperDir, 'rollup.config.js'),
    '-w'
  ], {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  rollupWatch.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.trim()) {
      console.log(`[wrapper] ${output.trim()}`);
    }
    if (output.includes('created') || output.includes('bundled')) {
      setTimeout(buildCombinedBundle, 100);
    }
  });

  rollupWatch.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.trim()) {
      console.error(`[wrapper] ${output.trim()}`);
    }
  });

  // Handle errors
  webchatWatch.on('error', (err) => console.error('Webchat watch error:', err));
  rollupWatch.on('error', (err) => console.error('Rollup watch error:', err));

  // Handle exit
  const cleanup = () => {
    console.log('\n\n👋 Stopping dev mode...');
    webchatWatch.kill();
    rollupWatch.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('✨ Dev mode ready! Watching for changes...\n');
}

dev().catch(err => {
  console.error('Dev failed:', err);
  process.exit(1);
});

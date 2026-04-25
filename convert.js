#!/usr/bin/env node
/**
 * GLB compression: downloads/ -> converted/
 * Two-step gltf-transform pipeline: WebP textures (q15), then Draco geometry + weld.
 * Removes source on success. Skips files already present in converted/.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK_DIR = __dirname;
const DOWNLOADS_DIR = path.join(WORK_DIR, 'downloads');
const CONVERTED_DIR = path.join(WORK_DIR, 'converted');

if (!fs.existsSync(CONVERTED_DIR)) fs.mkdirSync(CONVERTED_DIR, { recursive: true });
if (!fs.existsSync(DOWNLOADS_DIR)) {
  console.log(`[Convert] No downloads dir at ${DOWNLOADS_DIR}`);
  process.exit(0);
}

const todo = fs.readdirSync(DOWNLOADS_DIR)
  .filter(f => f.endsWith('.glb'))
  .filter(f => !fs.existsSync(path.join(CONVERTED_DIR, f)));

if (todo.length === 0) {
  console.log('[Convert] Nothing to do');
  process.exit(0);
}

console.log(`[Convert] ${todo.length} file(s) — WebP q15 + Draco`);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); if (process.env.DEBUG_CONVERT) process.stderr.write(d); });
    if (process.env.DEBUG_CONVERT) proc.stdout.on('data', d => process.stdout.write(d));
    const timer = setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, 50 * 60 * 1000);
    proc.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`exit ${code}: ${err.slice(-200)}`));
    });
    proc.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

(async () => {
  let ok = 0, fail = 0;
  for (const f of todo) {
    const src = path.join(DOWNLOADS_DIR, f);
    const out = path.join(CONVERTED_DIR, f);
    const tmp = path.join(CONVERTED_DIR, f + '.tmp.glb');
    process.stdout.write(`  ${f}... `);
    try {
      await run('bunx', ['@gltf-transform/cli', 'webp', src, tmp, '--quality', '15']);
      await run('bunx', ['@gltf-transform/cli', 'optimize', tmp, out,
        '--compress', 'draco', '--texture-compress', 'false', '--weld', 'true']);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      const sIn = fs.statSync(src).size, sOut = fs.statSync(out).size;
      console.log(`✓ ${(sIn/1024/1024).toFixed(1)} MB → ${(sOut/1024/1024).toFixed(2)} MB`);
      fs.unlinkSync(src);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      fail++;
    }
  }
  console.log(`[Convert] Done — ${ok} ok, ${fail} fail`);
})();

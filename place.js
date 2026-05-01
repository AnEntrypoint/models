#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK_DIR = __dirname;
const DOWNLOADS_DIR = path.join(WORK_DIR, 'downloads');
const CONVERTED_DIR = path.join(WORK_DIR, 'converted');
const ASSETS_ROOT = 'C:\\dev\\assets';
const GLTF_BIN = process.platform === 'win32'
  ? path.join(WORK_DIR, 'node_modules', '.bin', 'gltf-transform.exe')
  : path.join(WORK_DIR, 'node_modules', '.bin', 'gltf-transform');

if (!fs.existsSync(CONVERTED_DIR)) fs.mkdirSync(CONVERTED_DIR, { recursive: true });

const categoryRules = [
  [/ambulance|gurney|hospital/, 'Medical'],
  [/pine tree|tree|forest|plant|flower|bush|shrub/, 'Nature'],
  [/cargo ship|sailboat|boat|ship|vessel/, 'Vehicles'],
  [/campfire|swing set|bench|fountain|lamp post|street lamp|fire pit/, 'Outdoor'],
  [/chair|table|sofa|couch|desk|shelf|cabinet|bookshelf/, 'Furniture'],
  [/car|truck|bus|van|motorcycle|bicycle|vehicle|tractor|jeep/, 'Vehicles'],
  [/gun|rifle|sword|weapon|pistol|knife|blade/, 'Weapons'],
  [/phone|laptop|computer|tv|television|monitor|keyboard|speaker/, 'Electronics'],
];

function getCategory(subject) {
  const s = subject.toLowerCase();
  for (const [re, cat] of categoryRules) {
    if (re.test(s)) return cat;
  }
  return 'Misc';
}

function subjectFromFilename(filename) {
  const parts = filename.replace('.glb', '').split('_');
  return parts.slice(0, -2).join(' ');
}

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
    proc.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

function placeFile(filename) {
  const src = path.join(CONVERTED_DIR, filename);
  const subject = subjectFromFilename(filename);
  const category = getCategory(subject);
  const destDir = path.join(ASSETS_ROOT, category);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  fs.renameSync(src, dest);
  return { category, dest };
}

(async () => {
  // Build set of already-placed files
  const placed = new Set();
  function walkAssets(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir)) {
      if (e.startsWith('.') || e === 'docs') continue;
      const p = path.join(dir, e);
      if (fs.statSync(p).isDirectory()) walkAssets(p);
      else if (e.endsWith('.glb')) placed.add(e);
    }
  }
  walkAssets(ASSETS_ROOT);

  // Move already-converted files that haven't been placed yet
  if (fs.existsSync(CONVERTED_DIR)) {
    for (const f of fs.readdirSync(CONVERTED_DIR).filter(f => f.endsWith('.glb'))) {
      if (!placed.has(f)) {
        const { category, dest } = placeFile(f);
        console.log(`[place] ${f} -> ${category}`);
        placed.add(f);
      }
    }
  }

  // Now convert + place remaining downloads
  const todo = fs.readdirSync(DOWNLOADS_DIR)
    .filter(f => f.endsWith('.glb'))
    .filter(f => !placed.has(f));

  if (todo.length === 0) {
    console.log('[place] Nothing to convert — all files placed');
    return;
  }

  console.log(`[place] ${todo.length} file(s) to convert and place`);
  let ok = 0, fail = 0;

  for (const f of todo) {
    const src = path.join(DOWNLOADS_DIR, f);
    const out = path.join(CONVERTED_DIR, f);
    const tmp = path.join(CONVERTED_DIR, f + '.tmp.glb');
    process.stdout.write(`  [${ok + fail + 1}/${todo.length}] ${f}... `);
    try {
      await run(GLTF_BIN, ['webp', src, tmp, '--quality', '15']);
      await run(GLTF_BIN, ['optimize', tmp, out,
        '--compress', 'draco', '--texture-compress', 'false', '--weld', 'true']);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      const sIn = fs.statSync(src).size, sOut = fs.statSync(out).size;
      fs.unlinkSync(src);
      const { category } = placeFile(f);
      console.log(`✓ ${(sIn/1024/1024).toFixed(1)}MB -> ${(sOut/1024/1024).toFixed(2)}MB [${category}]`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch {}
      fail++;
    }
  }
  console.log(`[place] Done — ${ok} ok, ${fail} fail`);
})();

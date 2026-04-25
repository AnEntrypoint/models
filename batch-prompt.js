#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LIST_FILE = path.join(__dirname, 'missing-assets.json');
const ROUNDS = 4;
const PER_ROUND = 5;
const WAIT_BETWEEN_ROUNDS_MS = 300000;

let remaining = JSON.parse(fs.readFileSync(LIST_FILE, 'utf8'));

if (remaining.length === 0) {
  console.log('Nothing left in missing-assets.json.');
  process.exit(0);
}

for (let round = 0; round < ROUNDS; round++) {
  if (remaining.length === 0) {
    console.log('List exhausted — done early.');
    break;
  }

  const batch = remaining.splice(0, PER_ROUND);
  console.log(`\n=== Round ${round + 1}/${ROUNDS} (${remaining.length} remain after this round) ===`);

  for (const subject of batch) {
    console.log(`  Submitting: "${subject}"`);
    try {
      execSync(`bun run prompt --prompt "${subject}" --topo triangle`, {
        cwd: __dirname,
        stdio: 'inherit',
        timeout: 300000
      });
    } catch (e) {
      console.error(`  Failed: ${e.message.slice(0, 120)}`);
    }
  }

  fs.writeFileSync(LIST_FILE, JSON.stringify(remaining, null, 2));
  console.log(`  Progress saved. ${remaining.length} items remain in missing-assets.json.`);

  if (round < ROUNDS - 1 && remaining.length > 0) {
    const secs = WAIT_BETWEEN_ROUNDS_MS / 1000;
    console.log(`  Waiting ${secs}s before next round...`);
    const start = Date.now();
    while (Date.now() - start < WAIT_BETWEEN_ROUNDS_MS) {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      process.stdout.write(`\r  ${secs - elapsed}s remaining...   `);
      spawnSync('node', ['-e', 'setTimeout(()=>{},1000)'], { timeout: 1500 });
    }
    process.stdout.write('\r  Wait complete.              \n');
  }
}

console.log('\nDone. Run again to submit the next batch.');

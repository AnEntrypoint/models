# Hunyuan 3D Asset Tools

Working directory for all commands: `C:/models`

`browser-session.json` here provides auth. Do not move it.

---

## List available models

```
bun run list
```

Fetches `https://raw.githubusercontent.com/AnEntrypoint/assets/master/docs/manifest.json` and prints every model name. The manifest is keyed by category; each model has multiple variant GLBs (v1–v4), so names repeat heavily — deduplicate before reasoning about what exists.

---

## Generate a new 3D asset (non-interactive — always use this form)

```
bun run prompt --prompt "a wooden chair" --topo triangle
```

**IMPORTANT:** Always pass `--prompt "subject"` explicitly. Never run `bun run prompt` with no `--prompt` argument — it enters interactive mode and hangs in automated contexts. Multi-word subjects must be quoted. Omit `--style` to use the default style.

**Styles:** 通用 · 石雕 · 青花瓷 · 中国风 · 卡通 · 赛博朋克  
**Topo:** `triangle` (default) · `quad`

Polls until all 4 variants complete (~2-3 min). GLB URLs printed on completion.

---

## Download all pending assets

```
bun run download
```

Downloads everything from the API not yet saved locally. GLB files go to `downloads/`.

**Do not** run `bun run download` expecting it to trigger new generation — it only downloads already-generated assets that are pending in the queue.

---

## Batch prompt multiple assets (non-blocking)

To submit multiple generation requests **without waiting** for each to complete:

```javascript
const { execSync } = require('child_process');

const models = [
  'a vintage typewriter',
  'a wooden bookshelf',
  'a ceramic vase',
  'a retro bicycle',
  'a marble statue'
];

models.forEach((model, index) => {
  console.log(`[${index + 1}/${models.length}] Starting: "${model}"`);
  try {
    execSync(`bun run prompt --prompt "${model}" --topo triangle`, {
      cwd: 'C:\\models',
      stdio: 'inherit'
    });
  } catch (err) {
    // Runs in background; errors expected
  }
});

console.log('All prompts submitted. Generation proceeding in parallel.');
```

**Key points:**
- Each `bun run prompt` submits to the API and returns immediately (non-blocking)
- All requests execute in parallel — no need to wait between them
- Generation typically takes 2-3 minutes per asset
- Download all completed assets later with `bun run download`

---

## Agent workflow: pick and generate missing assets

1. Run `bun run list` — capture output, deduplicate names (many repeat due to variants).
2. Decide which assets are missing from the deduplicated list.
3. Batch submit all new prompts using the script above (or run individual `bun run prompt` commands in a loop)
4. Proceed with other work while generation runs in background
5. Later, run `bun run download` to fetch all completed assets

---

## Via package.json scripts

All scripts except `auth` are non-interactive and safe to run from agents:

```
bun run list                                             # print all model names from manifest
bun run prompt --prompt "subject" --topo triangle   # generate one asset
bun run download                                         # download all pending assets from queue
bun run auth                                             # INTERACTIVE — human only, opens browser to log in
```

---

---

## GLB Compression Pipeline

**convert.js** — automated two-step compression pipeline for 3D assets:
- **Input:** `downloads/` (uncompressed GLB files)
- **Output:** `converted/` (compressed GLB files)
- **Process:** WebP texture conversion (quality 15) → Draco geometry compression + welding
- **Execution:** `node convert.js` (processes remaining files, skips those already in `converted/`)
- **Status tracking:** Progress logged to `convert.log`; each successful file removed from `downloads/` after conversion
- **Performance:** ~12 min per file; 50 min timeout per file; if interrupted, restart safely (script skips already-converted files)

**To restart:**
```bash
node convert.js
```

The script can be safely interrupted and restarted at any time — it automatically skips files already present in `converted/`.

---

## Auth

Session valid ~30 days. `bun run auth` is the only interactive command — it opens a browser to re-authenticate and saves a new `browser-session.json`. Must be run by a human in an interactive terminal. Agents must not run it.

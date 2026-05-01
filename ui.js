import { mount, components as C } from 'anentrypoint-design';

const MANIFEST_URL = 'https://raw.githubusercontent.com/AnEntrypoint/assets/master/docs/manifest.json';

async function loadAssets() {
  try {
    const res = await fetch(MANIFEST_URL);
    const data = await res.json();
    const seen = new Set();
    const all = [];
    for (const [category, items] of Object.entries(data)) {
      for (const m of items) {
        if (!seen.has(m.name)) {
          seen.add(m.name);
          all.push({ name: m.name, category });
        }
      }
    }
    return all;
  } catch {
    return [];
  }
}

async function init() {
  const assets = await loadAssets();

  const rows = assets.length
    ? assets.map((a, i) => C.Row({ key: i, title: a.name, meta: a.category }))
    : [C.Row({ title: 'No assets found' })];

  mount(document.getElementById('app'), () =>
    C.AppShell({
      topbar: C.Topbar({
        brand: 'models',
        leaf: '3D',
        items: [['assets', '#/assets']],
      }),
      main: C.Panel({ title: 'Assets', count: assets.length, children: rows }),
      status: C.Status({ left: ['Hunyuan 3D'], right: [assets.length + ' models'] }),
    })
  );
}

init();

/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
  console.error(`[tuning-manufacturers] ERROR: ${msg}`);
  process.exitCode = 1;
}

function main() {
  const p = path.join(process.cwd(), 'data', 'reference', 'tuning-manufacturers.json');
  const raw = fs.readFileSync(p, 'utf8');
  const json = JSON.parse(raw);

  const allowedCats = new Set((json.metadata && json.metadata.allowedCategories) || []);
  const allowedSources = new Set((json.metadata && json.metadata.allowedApprovalSources) || []);
  const manufacturers = Array.isArray(json.manufacturers) ? json.manufacturers : [];

  if (manufacturers.length < 100) {
    fail(`Expected at least 100 manufacturers, got ${manufacturers.length}`);
  }

  const seen = new Set();
  for (const m of manufacturers) {
    if (!m || typeof m !== 'object') {
      fail('Manufacturer entry is not an object');
      continue;
    }
    if (typeof m.id !== 'string' || !m.id.trim()) fail('Missing manufacturer.id');
    if (typeof m.name !== 'string' || !m.name.trim()) fail(`Missing manufacturer.name for id=${m.id}`);
    const id = String(m.id || '').trim();
    if (!/^[a-z0-9_]+$/.test(id)) fail(`Invalid id format: ${id} (expected [a-z0-9_]+)`);
    if (seen.has(id)) fail(`Duplicate id: ${id}`);
    seen.add(id);

    const categories = Array.isArray(m.categories) ? m.categories : [];
    for (const c of categories) {
      const cat = String(c || '').trim();
      if (cat && !allowedCats.has(cat)) fail(`Unknown category '${cat}' in id=${id}`);
    }

    const sources = Array.isArray(m.approvalSources) ? m.approvalSources : [];
    for (const s of sources) {
      const src = String(s || '').trim();
      if (src && !allowedSources.has(src)) fail(`Unknown approvalSources '${src}' in id=${id}`);
    }
  }

  if (!process.exitCode) {
    console.log(`[tuning-manufacturers] OK: ${manufacturers.length} manufacturers, ${seen.size} unique ids.`);
  }
}

main();


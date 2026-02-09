/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
  console.error(`[tuning-legality] ${msg}`);
  process.exit(1);
}

function main() {
  const repoRoot = process.cwd();
  const filePath = path.join(repoRoot, 'data', 'reference', 'tuning-legality-de.json');
  if (!fs.existsSync(filePath)) fail(`Missing file: ${filePath}`);

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!doc || typeof doc !== 'object') fail('Root must be an object');
  if (doc.country !== 'DE') fail('country must be "DE"');
  if (!doc.version) fail('version is required');
  if (!Array.isArray(doc.sources)) fail('sources must be an array');
  if (!doc.approvalTypeDefinitions || typeof doc.approvalTypeDefinitions !== 'object') {
    fail('approvalTypeDefinitions must be an object');
  }
  if (!Array.isArray(doc.categories)) fail('categories must be an array');

  const categoryIds = new Set();
  const subcategoryIds = new Set();
  const sourceIds = new Set(doc.sources.map((s) => s && s.id).filter(Boolean));
  const allowedApprovalTypes = new Set(Object.keys(doc.approvalTypeDefinitions || {}));
  if (!sourceIds.size) fail('sources must include ids');
  if (!allowedApprovalTypes.size) fail('approvalTypeDefinitions must include keys');

  const seenItemKeys = new Set();

  for (const cat of doc.categories) {
    if (!cat?.id) fail('category.id missing');
    if (categoryIds.has(cat.id)) fail(`duplicate category id: ${cat.id}`);
    categoryIds.add(cat.id);
    if (!Array.isArray(cat.subcategories)) fail(`category ${cat.id} subcategories must be an array`);

    for (const sub of cat.subcategories) {
      const sid = `${cat.id}/${sub?.id}`;
      if (!sub?.id) fail(`subcategory.id missing under ${cat.id}`);
      if (subcategoryIds.has(sid)) fail(`duplicate subcategory id: ${sid}`);
      subcategoryIds.add(sid);
      if (!Array.isArray(sub.items)) fail(`subcategory ${sid} items must be an array`);
      if (!Array.isArray(sub.approvalTypes)) fail(`subcategory ${sid} approvalTypes must be an array`);
      for (const at of sub.approvalTypes) {
        if (!allowedApprovalTypes.has(String(at))) {
          fail(`subcategory ${sid} unknown approvalType: ${String(at)}`);
        }
      }

      for (const it of sub.items) {
        if (!it?.brand || !it?.model) fail(`item requires brand+model in ${sid}`);
        if (!it?.approvalType) fail(`item requires approvalType in ${sid}`);
        if (!allowedApprovalTypes.has(String(it.approvalType))) {
          fail(`item unknown approvalType: ${String(it.approvalType)} in ${sid}`);
        }
        if (!it?.sourceId) fail(`item requires sourceId in ${sid}`);
        if (!sourceIds.has(it.sourceId)) fail(`item sourceId unknown: ${it.sourceId} in ${sid}`);

        const key = `${sid}|${String(it.brand).trim()}|${String(it.model).trim()}|${String(it.approvalNumber || '')}`.toLowerCase();
        if (seenItemKeys.has(key)) fail(`duplicate item key in ${sid}: ${it.brand} ${it.model} ${it.approvalNumber || ''}`);
        seenItemKeys.add(key);
      }
    }
  }

  console.log(`[tuning-legality] OK: categories=${categoryIds.size}, subcategories=${subcategoryIds.size}, items=${seenItemKeys.size}`);
}

main();

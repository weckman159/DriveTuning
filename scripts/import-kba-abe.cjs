/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

function parseCsv(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (!nonEmpty.length) return { headers: [], rows: [] };

  const sample = nonEmpty[0];
  const delimiter = sample.includes(';') && !sample.includes(',') ? ';' : ',';

  function parseLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  const headers = parseLine(nonEmpty[0]).map((h) => h.replace(/^\uFEFF/, ''));
  const rows = [];
  for (const line of nonEmpty.slice(1)) {
    const cols = parseLine(line);
    if (!cols.length) continue;
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i] || `col_${i}`] = cols[i] === undefined ? '' : cols[i];
    }
    rows.push(row);
  }
  return { headers, rows };
}

async function main() {
  const url = process.env.KBA_ABE_CSV_URL;
  if (!url) {
    console.log('[kba-abe] KBA_ABE_CSV_URL not set. Skipping import.');
    console.log('[kba-abe] Provide a verified CSV URL and rerun.');
    process.exit(0);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const csvText = await res.text();
  const parsed = parseCsv(csvText);

  const repoRoot = process.cwd();
  const outPath = path.join(repoRoot, 'data', 'reference', 'kba-abe-raw.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        sourceUrl: url,
        fetchedAt: new Date().toISOString(),
        headers: parsed.headers,
        count: parsed.rows.length,
        rows: parsed.rows.slice(0, 20000),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`[kba-abe] OK: rows=${parsed.rows.length} -> ${path.relative(repoRoot, outPath)}`);
  if (parsed.rows.length > 20000) {
    console.log('[kba-abe] Note: file truncated to first 20k rows for repo size control.');
  }
}

main().catch((err) => {
  console.error('[kba-abe] ERROR', err instanceof Error ? err.message : err);
  process.exit(1);
});


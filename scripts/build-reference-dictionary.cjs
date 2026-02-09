/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

function stripBom(input) {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

// Minimal CSV parser for our reference files (comma-separated, optional double quotes).
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text) {
  const normalized = stripBom(String(text || '')).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.every((c) => c === '')) continue;
    rows.push(cols);
  }
  return { headers, rows };
}

function safeGetColIndex(headers, name) {
  const idx = headers.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());
  return idx >= 0 ? idx : -1;
}

function collectCarCatalogEntries(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCsv(txt);

  // Expect: "Марка,Модель,Годы выпуска,..."
  const makeIdx = safeGetColIndex(headers, 'Марка');
  const modelIdx = safeGetColIndex(headers, 'Модель');
  const yearsIdx = safeGetColIndex(headers, 'Годы выпуска');
  const bodyIdx = safeGetColIndex(headers, 'Номер кузова');
  const engineIdx = safeGetColIndex(headers, 'Объём двигателя (L)');
  const fuelIdx = safeGetColIndex(headers, 'Вид топлива');
  const powerIdx = safeGetColIndex(headers, 'Мощность (ps)');
  const batteryIdx = safeGetColIndex(headers, 'Ёмкость батареи (kWh)');
  if (makeIdx < 0 || modelIdx < 0) return [];

  const out = [];
  for (const r of rows) {
    const make = String(r[makeIdx] || '').trim();
    const model = String(r[modelIdx] || '').trim();
    const years = yearsIdx >= 0 ? String(r[yearsIdx] || '').trim() : '';
    if (!make || !model) continue;

    const bodyCode = bodyIdx >= 0 ? String(r[bodyIdx] || '').trim() : '';
    const engineRaw = engineIdx >= 0 ? String(r[engineIdx] || '').trim() : '';
    const fuel = fuelIdx >= 0 ? String(r[fuelIdx] || '').trim() : '';
    const powerRaw = powerIdx >= 0 ? String(r[powerIdx] || '').trim() : '';
    const batteryRaw = batteryIdx >= 0 ? String(r[batteryIdx] || '').trim() : '';

    // Keep parsing intentionally forgiving; source files can be inconsistent.
    const engineLiters = engineRaw ? Number(String(engineRaw).replace(/[^0-9.]/g, '')) : null;
    const powerPs = powerRaw ? Number(String(powerRaw).replace(/[^0-9.]/g, '')) : null;
    const batteryKwh = batteryRaw ? Number(String(batteryRaw).replace(/[^0-9.]/g, '')) : null;

    out.push({
      make,
      model,
      years,
      bodyCode: bodyCode || null,
      engineLiters: Number.isFinite(engineLiters) ? engineLiters : null,
      fuel: fuel || null,
      powerPs: Number.isFinite(powerPs) ? Math.round(powerPs) : null,
      batteryKwh: Number.isFinite(batteryKwh) ? batteryKwh : null,
    });
  }
  return out;
}

function collectBrandEntries(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCsv(txt);

  // Expect: "Марка,Страна,..."
  const makeIdx = safeGetColIndex(headers, 'Марка');
  if (makeIdx < 0) return [];

  const out = [];
  for (const r of rows) {
    const brand = String(r[makeIdx] || '').trim();
    if (brand) out.push(brand);
  }
  return out;
}

function sortLocale(arr) {
  return [...arr].sort((a, b) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base' }));
}

function extractYearNumbers(input) {
  const out = [];
  const re = /(\d{4})/g;
  let m = null;
  while ((m = re.exec(String(input || '')))) {
    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;
    out.push(n);
  }
  return out;
}

function yearsFromLabel(label) {
  const cleaned = String(label || '').trim();
  if (!cleaned) return [];

  const nums = extractYearNumbers(cleaned);
  const nowYear = new Date().getFullYear();

  // e.g. "2008–н.в." => treat as start..now
  if (nums.length === 1) {
    const start = nums[0];
    const end = Math.max(start, Math.min(nowYear, start + 120));
    if (start < 1900 || start > nowYear + 1) return [];
    const out = [];
    for (let y = start; y <= end; y++) out.push(y);
    return out;
  }

  if (nums.length >= 2) {
    const start = Math.min(nums[0], nums[1]);
    const rawEnd = Math.max(nums[0], nums[1]);
    const end = Math.min(rawEnd, nowYear);
    if (start < 1900 || start > nowYear + 1) return [];
    if (end < start) return [];
    if (end - start > 120) return [];
    const out = [];
    for (let y = start; y <= end; y++) out.push(y);
    return out;
  }

  return [];
}

function isOngoingLabel(label) {
  const s = String(label || '').toLowerCase();
  return s.includes('н.в.');
}

function summarizeYearLabels(labels) {
  const cleaned = Array.from(labels || []).map((v) => String(v || '').trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  let minStart = null;
  let maxEnd = null;
  let anyOngoing = false;
  for (const l of cleaned) {
    anyOngoing = anyOngoing || isOngoingLabel(l);
    const nums = extractYearNumbers(l);
    if (nums.length >= 1) {
      const start = nums[0];
      minStart = minStart == null ? start : Math.min(minStart, start);
    }
    if (nums.length >= 2) {
      const end = nums[1];
      maxEnd = maxEnd == null ? end : Math.max(maxEnd, end);
    } else if (nums.length === 1) {
      // For "YYYY–н.в." we only have one number; end is implied.
      maxEnd = maxEnd == null ? nums[0] : Math.max(maxEnd, nums[0]);
    }
  }

  if (minStart == null) return cleaned[0];
  if (anyOngoing) return `${minStart}–н.в.`;
  if (maxEnd == null) return String(minStart);
  return `${minStart}–${maxEnd}`;
}

function normStr(v) {
  const s = String(v || '').trim();
  return s ? s : null;
}

function normNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeVariant(v) {
  return {
    years: normStr(v.years),
    bodyCode: normStr(v.bodyCode),
    engineLiters: (() => {
      const n = normNum(v.engineLiters);
      return n == null ? null : n;
    })(),
    fuel: normStr(v.fuel),
    powerPs: (() => {
      const n = normNum(v.powerPs);
      return n == null ? null : Math.round(n);
    })(),
    batteryKwh: (() => {
      const n = normNum(v.batteryKwh);
      return n == null ? null : n;
    })(),
  };
}

function dedupeAndFixVariants(variants) {
  const list = Array.isArray(variants) ? variants.map(normalizeVariant) : [];
  const byIdentity = new Map(); // years|engine|fuel|power -> Map(battery -> variant)

  for (const v of list) {
    const id = [
      v.years || '',
      v.bodyCode || '',
      v.engineLiters == null ? '' : String(v.engineLiters),
      v.fuel || '',
      v.powerPs == null ? '' : String(v.powerPs),
    ].join('|');

    if (!byIdentity.has(id)) byIdentity.set(id, new Map());
    const bucket = byIdentity.get(id);
    const bKey = v.batteryKwh == null ? '' : String(v.batteryKwh);
    if (!bucket.has(bKey)) bucket.set(bKey, v);
  }

  const out = [];
  for (const bucket of byIdentity.values()) {
    const batteries = Array.from(bucket.keys())
      .map((k) => (k === '' ? null : Number(k)))
      .filter((n) => n == null || Number.isFinite(n));

    // Fix common data-entry error: battery capacity 10x too large (e.g. 800 vs 80).
    const batterySet = new Set(batteries.filter((n) => n != null));
    for (const n of Array.from(batterySet)) {
      const smaller = n / 10;
      if (Number.isFinite(smaller) && smaller > 0 && batterySet.has(smaller)) {
        bucket.delete(String(n));
      }
    }

    for (const v of bucket.values()) out.push(v);
  }

  return out;
}

function main() {
  const repoRoot = process.cwd();
  const srcDir = path.join(repoRoot, 'data', 'reference', 'source');
  const outPath = path.join(repoRoot, 'data', 'reference', 'dictionary.json');

  if (!fs.existsSync(srcDir)) {
    console.error(`Missing source dir: ${srcDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(srcDir).map((name) => path.join(srcDir, name));

  const preferredCarFiles = files
    .filter((p) => /cars_.*\.csv$/i.test(p))
    .slice()
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en', { sensitivity: 'base' }));

  const carFiles = preferredCarFiles.length
    ? preferredCarFiles
    : files.filter((p) => /germany_cars\.csv$/i.test(p) || /Qwen_csv_20260208_.*\.(txt|csv)$/i.test(p));
  const brandFiles = files.filter((p) => /brands_table\.csv$/i.test(p));

  const carEntries = carFiles.flatMap((p) => collectCarCatalogEntries(p));
  const brandEntries = brandFiles.flatMap((p) => collectBrandEntries(p));

  const carMakes = new Set();
  const brands = new Set();
  const carModelsByMake = new Map(); // make -> Set(model)
  const yearLabelsByMakeModel = new Map(); // make -> Map(model -> Set(yearLabel))
  const yearsListByMakeModel = new Map(); // make -> Map(model -> Set(year))
  const variantsByMakeModel = new Map(); // make -> Map(model -> Array(variant))

  for (const e of carEntries) {
    carMakes.add(e.make);
    brands.add(e.make);

    if (!carModelsByMake.has(e.make)) carModelsByMake.set(e.make, new Set());
    carModelsByMake.get(e.make).add(e.model);

    if (!yearLabelsByMakeModel.has(e.make)) yearLabelsByMakeModel.set(e.make, new Map());
    if (!yearsListByMakeModel.has(e.make)) yearsListByMakeModel.set(e.make, new Map());
    if (!variantsByMakeModel.has(e.make)) variantsByMakeModel.set(e.make, new Map());

    const labelsMap = yearLabelsByMakeModel.get(e.make);
    if (!labelsMap.has(e.model)) labelsMap.set(e.model, new Set());
    if (e.years) labelsMap.get(e.model).add(e.years);

    const yearsMap = yearsListByMakeModel.get(e.make);
    if (!yearsMap.has(e.model)) yearsMap.set(e.model, new Set());
    for (const y of yearsFromLabel(e.years)) yearsMap.get(e.model).add(y);

    const vMap = variantsByMakeModel.get(e.make);
    if (!vMap.has(e.model)) vMap.set(e.model, []);
    vMap.get(e.model).push({
      years: e.years || null,
      bodyCode: e.bodyCode || null,
      engineLiters: e.engineLiters ?? null,
      fuel: e.fuel ?? null,
      powerPs: e.powerPs ?? null,
      batteryKwh: e.batteryKwh ?? null,
    });
  }

  for (const b of brandEntries) brands.add(b);

  const carYearsByMakeModelObj = {};
  const carYearsListByMakeModelObj = {};
  const carVariantsByMakeModelObj = {};
  const carModelsByMakeObj = {};

  for (const make of carMakes) {
    const labelMap = yearLabelsByMakeModel.get(make) || new Map();
    const yearsMap = yearsListByMakeModel.get(make) || new Map();
    const vMap = variantsByMakeModel.get(make) || new Map();

    const yObj = {};
    const yListObj = {};
    const vObj = {};

    const models = Array.from(carModelsByMake.get(make) || new Set());

    for (const model of models) {
      const labels = labelMap.get(model) || new Set();
      const yearsSummary = summarizeYearLabels(labels);
      if (yearsSummary) yObj[model] = yearsSummary;

      const yearsSet = yearsMap.get(model) || new Set();
      yListObj[model] = Array.from(yearsSet).sort((a, b) => a - b);

      const variants = vMap.get(model) || [];
      vObj[model] = dedupeAndFixVariants(variants);
    }

    carModelsByMakeObj[make] = models
      .slice()
      .sort((a, b) => {
        const aYears = yListObj[a];
        const bYears = yListObj[b];
        const aStart = Array.isArray(aYears) && aYears.length > 0 ? aYears[0] : 9999;
        const bStart = Array.isArray(bYears) && bYears.length > 0 ? bYears[0] : 9999;
        if (aStart !== bStart) return aStart - bStart;
        return String(a).localeCompare(String(b), 'de', { sensitivity: 'base' });
      });

    carYearsByMakeModelObj[make] = yObj;
    carYearsListByMakeModelObj[make] = yListObj;
    carVariantsByMakeModelObj[make] = vObj;
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      carCatalogFiles: carFiles.map((p) => path.basename(p)),
      brandFiles: brandFiles.map((p) => path.basename(p)),
    },
    carMakes: sortLocale(Array.from(carMakes)),
    brands: sortLocale(Array.from(brands)),
    carModelsByMake: carModelsByMakeObj,
    carYearsByMakeModel: carYearsByMakeModelObj,
    carYearsListByMakeModel: carYearsListByMakeModelObj,
    carVariantsByMakeModel: carVariantsByMakeModelObj,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`carMakes: ${payload.carMakes.length}, brands: ${payload.brands.length}`);
}

main();

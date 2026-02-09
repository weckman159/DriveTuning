/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

function stripBom(input) {
  const s = String(input || '');
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function readJson(filePath) {
  const txt = stripBom(fs.readFileSync(filePath, 'utf8'));
  return JSON.parse(txt);
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

function upperId(v) {
  const s = String(v || '').trim();
  return s ? s.toUpperCase() : null;
}

function lowerId(v) {
  const s = String(v || '').trim();
  return s ? s.toLowerCase() : null;
}

function main() {
  const repoRoot = process.cwd();
  const srcDir = path.join(repoRoot, 'data', 'reference', 'source');
  const outPath = path.join(repoRoot, 'data', 'reference', 'places.de.json');

  const statesPath = path.join(srcDir, 'places_states.de.json');
  const citiesPath = path.join(srcDir, 'places_cities.de.json');
  const districtsPath = path.join(srcDir, 'places_districts.de.json');

  for (const p of [statesPath, citiesPath, districtsPath]) {
    if (!fs.existsSync(p)) {
      console.error(`Missing source file: ${p}`);
      process.exit(1);
    }
  }

  const statesRaw = readJson(statesPath);
  const citiesRaw = readJson(citiesPath);
  const districtsRaw = readJson(districtsPath);

  const country = normStr(statesRaw.country) || normStr(citiesRaw.country) || normStr(districtsRaw.country) || 'DE';
  const countryName = normStr(statesRaw.countryName) || 'Deutschland';

  const states = Array.isArray(statesRaw.states)
    ? statesRaw.states
        .map((s) => ({
          id: upperId(s.id),
          name: normStr(s.name),
          nameEn: normStr(s.nameEn),
          capital: normStr(s.capital),
          population: normNum(s.population),
          areaKm2: normNum(s.areaKm2),
          region: normStr(s.region),
          isCityState: Boolean(s.isCityState),
        }))
        .filter((s) => s.id && s.name)
    : [];

  const cities = Array.isArray(citiesRaw.cities)
    ? citiesRaw.cities
        .map((c) => ({
          id: lowerId(c.id),
          name: normStr(c.name),
          stateId: upperId(c.stateId),
          population: normNum(c.population),
          coordinates:
            c.coordinates && typeof c.coordinates === 'object'
              ? {
                  lat: normNum(c.coordinates.lat),
                  lng: normNum(c.coordinates.lng),
                }
              : null,
          hasDistricts: Boolean(c.hasDistricts),
          postalCodePrefix: normStr(c.postalCodePrefix),
        }))
        .filter((c) => c.id && c.name && c.stateId)
    : [];

  const cityIds = new Set(cities.map((c) => c.id));
  const districtsByCity = {};
  const rawMap = districtsRaw.districtsByCity && typeof districtsRaw.districtsByCity === 'object' ? districtsRaw.districtsByCity : {};

  for (const [cityIdRaw, listRaw] of Object.entries(rawMap)) {
    const cityId = lowerId(cityIdRaw);
    if (!cityId || !cityIds.has(cityId)) continue;
    const list = Array.isArray(listRaw)
      ? listRaw
          .map((d) => ({
            id: lowerId(d.id),
            name: normStr(d.name),
            population: normNum(d.population),
          }))
          .filter((d) => d.id && d.name)
      : [];
    if (list.length > 0) districtsByCity[cityId] = list;
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      states: path.basename(statesPath),
      cities: path.basename(citiesPath),
      districts: path.basename(districtsPath),
    },
    country,
    countryName,
    states,
    cities,
    districtsByCity,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${outPath}`);
  console.log(`states: ${states.length}, cities: ${cities.length}, citiesWithDistricts: ${Object.keys(districtsByCity).length}`);
}

main();


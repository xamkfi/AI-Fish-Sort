#!/usr/bin/env node

/**
 * AI Fish Sort – mockup data generator
 *
 * Posts 2 new fish observations every 60 seconds via the
 * POST /api/v1/fish-observations endpoint.
 *
 * Configuration (environment variables):
 *   API_BASE_URL   – base URL of the running server   (default: http://localhost:3000)
 *   WRITE_API_KEY  – API key for write access          (default: none)
 */

"use strict";

// ── configuration ──────────────────────────────────────────────────────────

const BASE_URL = (process.env.API_BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const API_KEY = process.env.WRITE_API_KEY || "";
const INTERVAL_MS = 60_000; // 1 minute
const OBSERVATIONS_PER_TICK = 2;

// ── demo data (hardcoded fallback — matches db seeders) ────────────────────

const DEMO_SPECIES = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Hauki" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Ahven" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Kuha" },
  { id: "44444444-4444-4444-8444-444444444444", name: "Lohi" },
  { id: "55555555-5555-4555-8555-555555555555", name: "Siika" },
];

const DEMO_SORTING_UNITS = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
];

const DEMO_BATCHES = [
  "ba111111-1111-4111-8111-111111111111",
  "ba222222-2222-4222-8222-222222222222",
];

// ── realistic size ranges per species (mm / g) ─────────────────────────────

const SPECIES_SIZES = {
  Hauki: { length: [350, 1200], weight: [400, 8000] },
  Ahven: { length: [120, 450], weight: [40, 900] },
  Kuha: { length: [300, 750], weight: [400, 5000] },
  Lohi: { length: [450, 1050], weight: [1200, 9000] },
  Siika: { length: [220, 580], weight: [150, 2200] },
};

// ── helpers ─────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function log(...args) {
  console.log(`[${timestamp()}]`, ...args);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickSex() {
  const r = Math.random();
  if (r < 0.45) return "male";
  if (r < 0.9) return "female";
  return "unknown";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// wrapped normal-ish distribution – more realistic than uniform
function rangedValue(min, max) {
  const range = max - min;
  const center = min + range / 2;
  // Box-Muller simplified: sum of two uniforms creates a triangle distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const normalish = center + (u1 - u2) * range * 0.6;
  return clamp(Math.round(normalish), min, max);
}

// ── API fetch helpers ───────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  const body = await res.json();
  return body;
}

async function fetchSpecies() {
  try {
    const body = await fetchJson(`${BASE_URL}/api/v1/species`);
    if (Array.isArray(body.data) && body.data.length > 0) {
      return body.data.map((s) => ({ id: s.id, name: s.finnishName }));
    }
  } catch (err) {
    log(
      "Varoitus: lajeja ei voitu hakea API:sta, käytetään demodataa:",
      err.message,
    );
  }
  return DEMO_SPECIES;
}

async function fetchSortingUnits() {
  try {
    const body = await fetchJson(`${BASE_URL}/api/v1/sorting-units`);
    if (Array.isArray(body.data) && body.data.length > 0) {
      return body.data.map((u) => u.id);
    }
  } catch (err) {
    log(
      "Varoitus: lajitteluyksiköitä ei voitu hakea API:sta, käytetään demodataa:",
      err.message,
    );
  }
  return DEMO_SORTING_UNITS;
}

async function fetchBatches() {
  try {
    const body = await fetchJson(`${BASE_URL}/api/v1/fish-batches`);
    if (Array.isArray(body.data) && body.data.length > 0) {
      return body.data.map((b) => b.id);
    }
  } catch (err) {
    log(
      "Varoitus: eriä ei voitu hakea API:sta, käytetään demodataa:",
      err.message,
    );
  }
  return DEMO_BATCHES;
}

// ── observation generation ──────────────────────────────────────────────────

function generateObservation(speciesList, sortingUnitIds, batchIds) {
  const species = pick(speciesList);
  const sizes = SPECIES_SIZES[species.name] || {
    length: [100, 800],
    weight: [50, 4000],
  };

  return {
    speciesId: species.id,
    observedAt: new Date().toISOString(),
    sex: pickSex(),
    lengthMm: rangedValue(...sizes.length),
    weightG: rangedValue(...sizes.weight),
    sortingUnitId: pick(sortingUnitIds),
    batchId: pick(batchIds),
    aiConfidence: clamp(Math.random() * 0.2 + 0.8, 0, 1), // 0.80–1.00
  };
}

// ── API posting ─────────────────────────────────────────────────────────────

async function postObservation(observation) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }

  const res = await fetch(`${BASE_URL}/api/v1/fish-observations`, {
    method: "POST",
    headers,
    body: JSON.stringify(observation),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

// ── main loop ───────────────────────────────────────────────────────────────

async function tick(speciesList, sortingUnitIds, batchIds, tickNumber) {
  log(`Kierros #${tickNumber} — luodaan ${OBSERVATIONS_PER_TICK} havaintoa...`);

  for (let i = 0; i < OBSERVATIONS_PER_TICK; i++) {
    const obs = generateObservation(speciesList, sortingUnitIds, batchIds);
    try {
      await postObservation(obs);
      log(
        `  ✓ lähetetty: laji=${obs.speciesId.substring(0, 8)}... ` +
          `sukupuoli=${obs.sex} pituus=${obs.lengthMm}mm paino=${obs.weightG}g ` +
          `varmuus=${obs.aiConfidence.toFixed(4)}`,
      );
    } catch (err) {
      log(`  ✗ epäonnistui: ${err.message}`);
    }
  }
}

async function main() {
  if (!API_KEY) {
    log(
      "Varoitus: WRITE_API_KEY ei ole asetettu. POST-pyynnöt todennäköisesti " +
        "epäonnistuvat, ellei palvelin toimi ilman requireApiKey-middlewarea.",
    );
  }

  log(`Yhdistetään osoitteeseen ${BASE_URL} ...`);

  // fetch reference data once at startup
  const [speciesList, sortingUnitIds, batchIds] = await Promise.all([
    fetchSpecies(),
    fetchSortingUnits(),
    fetchBatches(),
  ]);

  log(
    `Valmis: ${speciesList.length} lajia, ${sortingUnitIds.length} lajitteluyksikköä, ` +
      `${batchIds.length} erää.`,
  );
  log(
    `Luodaan ${OBSERVATIONS_PER_TICK} havaintoa joka ` +
      `${INTERVAL_MS / 1000} sekunti.`,
  );
  log("Paina Ctrl+C lopettaaksesi generaatio.");

  let tickNumber = 0;

  // fire first tick immediately, then on interval
  await tick(speciesList, sortingUnitIds, batchIds, ++tickNumber);

  const interval = setInterval(() => {
    tick(speciesList, sortingUnitIds, batchIds, ++tickNumber);
  }, INTERVAL_MS);

  // graceful shutdown
  function shutdown() {
    log("Sammutetaan...");
    clearInterval(interval);
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Kriittinen virhe:", err);
  process.exit(1);
});

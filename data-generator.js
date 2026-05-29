#!/usr/bin/env node

/**
 * AI Fish Sort — Test Data Generator
 *
 * Periodically inserts random fish observations into the database
 * using the existing species, sorting units, and fish batches.
 *
 * Usage:
 *   node data-generator.js
 *
 * Optional env vars:
 *   INTERVAL_SECONDS   — How often to generate data (default: 120)
 *   OBSERVATIONS_PER_RUN — How many observations per batch (default: 5)
 *   NODE_ENV           — 'development' or 'production' (default: 'development')
 */

const crypto = require("crypto");
const db = require("./models");

const INTERVAL_SECONDS = parseInt(process.env.INTERVAL_SECONDS, 10) || 120;
const OBSERVATIONS_PER_RUN =
  parseInt(process.env.OBSERVATIONS_PER_RUN, 10) || 5;

// ── Species-specific realistic measurement ranges ──────────────────────────
const SPECIES_RANGES = {
  Hauki: { lengthMin: 300, lengthMax: 1000, weightMin: 400, weightMax: 8000 },
  Ahven: { lengthMin: 120, lengthMax: 400, weightMin: 50, weightMax: 800 },
  Kuha: { lengthMin: 350, lengthMax: 750, weightMin: 500, weightMax: 4000 },
  Lohi: { lengthMin: 400, lengthMax: 1000, weightMin: 1200, weightMax: 7000 },
  Siika: { lengthMin: 200, lengthMax: 550, weightMin: 150, weightMax: 2000 },
};

const SEXES = ["male", "female", "unknown"];
const SEX_WEIGHTS = [0.4, 0.4, 0.2]; // 40% male, 40% female, 20% unknown

// ── Helpers ────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max, decimals) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

// ── Global caches (refreshed each cycle to pick up any new data) ──────────

let speciesCache = [];
let sortingUnitCache = [];
let batchCache = [];

async function refreshCaches() {
  [speciesCache, sortingUnitCache, batchCache] = await Promise.all([
    db.Species.findAll({ raw: true }),
    db.SortingUnit.findAll({ raw: true }),
    db.FishBatch.findAll({ raw: true }),
  ]);
}

// ── Generate a single observation ──────────────────────────────────────────

function generateObservation() {
  const species = pickRandom(speciesCache);
  const ranges = SPECIES_RANGES[species.finnishName] || {
    lengthMin: 100,
    lengthMax: 500,
    weightMin: 100,
    weightMax: 1500,
  };

  const lengthMm = randomInt(ranges.lengthMin, ranges.lengthMax);
  // Rough weight-from-length heuristic with noise
  const estimatedWeight = randomInt(ranges.weightMin, ranges.weightMax);
  const sex = weightedRandom(SEXES, SEX_WEIGHTS);
  const aiConfidence = randomDecimal(0.75, 0.995, 4);

  const observation = {
    id: crypto.randomUUID(),
    observedAt: new Date(),
    speciesId: species.id,
    sex,
    lengthMm,
    weightG: estimatedWeight,
    sortingUnitId: pickRandom(sortingUnitCache).id,
    batchId: batchCache.length > 0 ? pickRandom(batchCache).id : null,
    aiConfidence,
    metadata: JSON.stringify({
      source: "data-generator",
      generatedAt: new Date().toISOString(),
    }),
  };

  return observation;
}

// ── Insert a batch of observations ─────────────────────────────────────────

async function insertObservations(count) {
  const observations = Array.from({ length: count }, () =>
    generateObservation(),
  );

  await db.FishObservation.bulkCreate(observations, {
    updateOnDuplicate: [
      "observedAt",
      "speciesId",
      "sex",
      "lengthMm",
      "weightG",
      "sortingUnitId",
      "batchId",
      "aiConfidence",
      "metadata",
      "updatedAt",
    ],
  });

  return observations;
}

// ── Main loop ──────────────────────────────────────────────────────────────

async function runCycle() {
  try {
    await refreshCaches();

    if (speciesCache.length === 0) {
      console.warn("[data-generator] No species found — skipping cycle.");
      return;
    }
    if (sortingUnitCache.length === 0) {
      console.warn("[data-generator] No sorting units found — skipping cycle.");
      return;
    }

    const inserted = await insertObservations(OBSERVATIONS_PER_RUN);
    console.log(
      `[${new Date().toISOString()}] Inserted ${inserted.length} observation(s)` +
        ` | species: ${speciesCache.length}, sortingUnits: ${sortingUnitCache.length}, batches: ${batchCache.length}`,
    );
  } catch (err) {
    console.error(`[data-generator] Error during cycle:`, err.message);
  }
}

// ── Startup ────────────────────────────────────────────────────────────────

async function main() {
  console.log("============================================");
  console.log("  AI Fish Sort — Test Data Generator");
  console.log(`  Interval:         ${INTERVAL_SECONDS}s`);
  console.log(`  Observations/run: ${OBSERVATIONS_PER_RUN}`);
  console.log("============================================");

  // Wait for database connection (models/index.js initialises on first require)
  try {
    await db.sequelize.authenticate();
    console.log("Database connection OK.\n");
  } catch (err) {
    console.error("CRITICAL: Could not connect to database.", err.message);
    process.exit(1);
  }

  // Run immediately, then every INTERVAL_SECONDS
  await runCycle();
  setInterval(runCycle, INTERVAL_SECONDS * 1000);

  console.log(
    `Generator running. Next cycle in ${INTERVAL_SECONDS}s. Press Ctrl+C to stop.\n`,
  );
}

// ── Graceful shutdown ──────────────────────────────────────────────────────

process.on("SIGINT", async () => {
  console.log("\n[data-generator] Shutting down...");
  await db.sequelize.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[data-generator] Shutting down...");
  await db.sequelize.close();
  process.exit(0);
});

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

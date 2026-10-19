'use strict';

const { FishBatch, FishObservation, SortingUnit, Species } = require('../models');

const ALLOWED_SEXES = ['male', 'female', 'unknown'];

const SEX_ALIASES = {
  male: 'male',
  m: 'male',
  koiras: 'male',
  female: 'female',
  f: 'female',
  naaras: 'female',
  unknown: 'unknown',
  '': 'unknown',
  'ei tiedossa': 'unknown'
};

function createImportError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKey(value) {
  return normalize(value).toLowerCase();
}

function parseSex(value) {
  const key = normalizeKey(value);
  if (!(key in SEX_ALIASES)) {
    throw createImportError(`Tuntematon sukupuoli: "${value}". Käytä arvoja koiras, naaras tai ei tiedossa.`);
  }
  return SEX_ALIASES[key];
}

function parseOptionalInteger(value, name) {
  if (value === undefined || value === null || normalize(String(value)) === '') {
    return null;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw createImportError(`${name} on oltava ei-negatiivinen kokonaisluku.`);
  }

  return number;
}

function parseOptionalConfidence(value) {
  if (value === undefined || value === null || normalize(String(value)) === '') {
    return null;
  }

  const number = Number(value);
  if (Number.isNaN(number) || number < 0 || number > 1) {
    throw createImportError('aiConfidence on oltava luku välillä 0-1.');
  }

  return number;
}

function parseObservedAt(value) {
  const raw = normalize(value);

  if (!raw) {
    return new Date();
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw createImportError(`Virheellinen päivämäärä: "${value}".`);
  }

  return date;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveSpecies(value) {
  const raw = normalize(value);
  if (!raw) {
    throw createImportError('Laji on pakollinen.');
  }

  if (isUuid(raw)) {
    const byId = await Species.findByPk(raw);
    if (byId) {
      return byId;
    }
  }

  const byName = await Species.findOne({
    where: { finnishName: raw }
  });

  if (!byName) {
    throw createImportError(`Lajia "${raw}" ei löytynyt.`);
  }

  return byName;
}

async function resolveSortingUnit(value) {
  const raw = normalize(value);
  if (!raw) {
    return null;
  }

  if (isUuid(raw)) {
    const byId = await SortingUnit.findByPk(raw);
    if (byId) {
      return byId;
    }
  }

  const byName = await SortingUnit.findOne({
    where: { name: raw }
  });

  if (!byName) {
    throw createImportError(`Lajitteluyksikköä "${raw}" ei löytynyt.`);
  }

  return byName;
}

async function resolveBatch(value) {
  const raw = normalize(value);
  if (!raw) {
    return null;
  }

  if (isUuid(raw)) {
    const byId = await FishBatch.findByPk(raw);
    if (byId) {
      return byId;
    }
  }

  const byCode = await FishBatch.findOne({
    where: { code: raw }
  });

  if (!byCode) {
    throw createImportError(`Erää "${raw}" ei löytynyt.`);
  }

  return byCode;
}

async function buildObservationValues(row) {
  const species = await resolveSpecies(row.species);
  const sortingUnit = await resolveSortingUnit(row.sortingUnit);
  const batch = await resolveBatch(row.batch);

  return {
    observedAt: parseObservedAt(row.observedAt),
    speciesId: species.id,
    sex: parseSex(row.sex),
    lengthMm: parseOptionalInteger(row.lengthMm, 'lengthMm'),
    weightG: parseOptionalInteger(row.weightG, 'weightG'),
    sortingUnitId: sortingUnit ? sortingUnit.id : null,
    batchId: batch ? batch.id : null,
    aiConfidence: parseOptionalConfidence(row.aiConfidence)
  };
}

async function showOptions(req, res) {
  try {
    const [species, sortingUnits, batches] = await Promise.all([
      Species.findAll({ order: [['finnishName', 'ASC']] }),
      SortingUnit.findAll({ order: [['name', 'ASC']] }),
      FishBatch.findAll({ order: [['code', 'ASC']] })
    ]);

    res.json({
      data: {
        species: species.map((item) => ({ id: item.id, finnishName: item.finnishName })),
        sortingUnits: sortingUnits.map((item) => ({ id: item.id, name: item.name })),
        batches: batches.map((item) => ({ id: item.id, code: item.code }))
      }
    });
  } catch (error) {
    console.error('Virhe tuontivalintojen haussa:', error);
    res.status(500).json({ error: 'Tuontivalintojen haku epäonnistui.' });
  }
}

async function importObservations(req, res) {
  const body = req.body || {};
  const rows = Array.isArray(body.rows) ? body.rows : [body];

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Ei tuotavia rivejä.' });
  }

  if (rows.length > 1000) {
    return res.status(400).json({ error: 'Kerralla voidaan tuoda enintään 1000 riviä.' });
  }

  const created = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    try {
      const values = await buildObservationValues(row);
      const observation = await FishObservation.create(values);
      created.push(observation);
    } catch (error) {
      console.error(`Virhe rivin ${index + 1} tuonnissa:`, error);

      if (error.status === 400) {
        errors.push({ row: index + 1, error: error.message });
      } else {
        errors.push({ row: index + 1, error: 'Rivin tallennus epäonnistui.' });
      }
    }
  }

  res.status(errors.length === 0 ? 201 : 207).json({
    message: `Tuotiin ${created.length} havaintoa, ${errors.length} riviä epäonnistui.`,
    created: created.length,
    failed: errors.length,
    errors
  });
}

module.exports = {
  importObservations,
  showOptions
};

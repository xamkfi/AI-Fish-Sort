'use strict';

const { CatchLocation, FishBatch, FishObservation, SortingUnit, Species } = require('../../models');
const {
  buildObservationWhere,
  createApiError,
  parsePagination
} = require('./helpers');

const includeRelations = [
  {
    model: Species,
    as: 'species',
    attributes: ['id', 'finnishName']
  },
  {
    model: SortingUnit,
    as: 'sortingUnit',
    attributes: ['id', 'name', 'municipality', 'description']
  },
  {
    model: FishBatch,
    as: 'batch',
    attributes: ['id', 'code', 'caughtFrom', 'caughtTo', 'receivedAt', 'description'],
    required: false,
    include: [{
      model: CatchLocation,
      as: 'catchLocation',
      attributes: ['id', 'name', 'waterBody', 'municipality', 'latitude', 'longitude', 'description']
    }]
  }
];

function withBatchFilter(batchWhere) {
  const hasBatchFilter = Object.keys(batchWhere || {}).length > 0;

  return includeRelations.map((include) => {
    if (include.as !== 'batch') {
      return include;
    }

    return {
      ...include,
      required: hasBatchFilter,
      where: hasBatchFilter ? batchWhere : undefined
    };
  });
}

async function list(req, res) {
  const { where, batchWhere, filters } = buildObservationWhere(req.query);
  const { limit, offset } = parsePagination(req.query);

  const result = await FishObservation.findAndCountAll({
    where,
    include: withBatchFilter(batchWhere),
    order: [['observedAt', 'DESC']],
    limit,
    offset
  });

  res.json({
    data: result.rows,
    pagination: {
      limit,
      offset,
      total: result.count
    },
    filters
  });
}

async function getById(req, res) {
  const observation = await FishObservation.findByPk(req.params.id, {
    include: includeRelations
  });

  if (!observation) {
    throw createApiError(404, 'NOT_FOUND', 'Fish observation not found.');
  }

  res.json({ data: observation });
}

function requireValue(body, name) {
  if (body[name] === undefined || body[name] === null || body[name] === '') {
    throw createApiError(400, 'VALIDATION_ERROR', `${name} is required.`);
  }

  return body[name];
}

function parseDateValue(value, name) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createApiError(400, 'VALIDATION_ERROR', `${name} must be a valid date.`);
  }

  return date;
}

function parseOptionalInteger(value, name) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw createApiError(400, 'VALIDATION_ERROR', `${name} must be a positive integer.`);
  }

  return number;
}

function parseOptionalConfidence(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);
  if (Number.isNaN(number) || number < 0 || number > 1) {
    throw createApiError(400, 'VALIDATION_ERROR', 'aiConfidence must be a number between 0 and 1.');
  }

  return number;
}

function parseSex(value) {
  const sex = value || 'unknown';
  const allowedSexes = ['male', 'female', 'unknown'];

  if (!allowedSexes.includes(sex)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'sex must be male, female or unknown.');
  }

  return sex;
}

function parseMetadata(value) {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'metadata must be a JSON object.');
  }

  return value;
}

async function create(req, res) {
  const body = req.body || {};
  const speciesId = requireValue(body, 'speciesId');
  const observedAt = parseDateValue(requireValue(body, 'observedAt'), 'observedAt');

  const species = await Species.findByPk(speciesId);
  if (!species) {
    throw createApiError(400, 'VALIDATION_ERROR', 'speciesId does not match any species.');
  }

  let sortingUnitId = body.sortingUnitId || body.locationId || null;
  if (sortingUnitId) {
    const sortingUnit = await SortingUnit.findByPk(sortingUnitId);
    if (!sortingUnit) {
      throw createApiError(400, 'VALIDATION_ERROR', 'sortingUnitId does not match any sorting unit.');
    }
  }

  let batchId = body.batchId || null;
  if (batchId) {
    const batch = await FishBatch.findByPk(batchId);
    if (!batch) {
      throw createApiError(400, 'VALIDATION_ERROR', 'batchId does not match any fish batch.');
    }
  }

  const observation = await FishObservation.create({
    observedAt,
    speciesId,
    sex: parseSex(body.sex),
    lengthMm: parseOptionalInteger(body.lengthMm, 'lengthMm'),
    weightG: parseOptionalInteger(body.weightG, 'weightG'),
    sortingUnitId,
    batchId,
    aiConfidence: parseOptionalConfidence(body.aiConfidence),
    metadata: parseMetadata(body.metadata)
  });

  const createdObservation = await FishObservation.findByPk(observation.id, {
    include: includeRelations
  });

  res.status(201).json({ data: createdObservation });
}

module.exports = {
  create,
  getById,
  list
};

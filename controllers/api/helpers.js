'use strict';

const { Op } = require('sequelize');

function asyncHandler(handler) {
  return function(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createApiError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function parseDateParam(value, name) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createApiError(400, 'VALIDATION_ERROR', `${name} must be a valid date.`);
  }

  return date;
}

function parsePositiveInteger(value, name, fallback, max) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw createApiError(400, 'VALIDATION_ERROR', `${name} must be a positive integer.`);
  }

  if (max && number > max) {
    return max;
  }

  return number;
}

function parsePagination(query) {
  return {
    limit: parsePositiveInteger(query.limit, 'limit', 50, 200),
    offset: parsePositiveInteger(query.offset, 'offset', 0)
  };
}

function parseIdList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((v) => parseIdList(v));
  }

  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function buildIdFilter(value) {
  const ids = parseIdList(value);

  if (ids.length === 0) {
    return null;
  }

  if (ids.length === 1) {
    return { whereValue: ids[0], filterValue: ids[0] };
  }

  return { whereValue: { [Op.in]: ids }, filterValue: ids };
}

function buildObservationWhere(query) {
  const where = {};
  const batchWhere = {};
  const filters = {};

  if (query.speciesId) {
    const filter = buildIdFilter(query.speciesId);
    if (filter) {
      where.speciesId = filter.whereValue;
      filters.speciesId = filter.filterValue;
    }
  }

  const sortingUnitId = query.sortingUnitId || query.locationId;
  if (sortingUnitId) {
    const filter = buildIdFilter(sortingUnitId);
    if (filter) {
      where.sortingUnitId = filter.whereValue;
      filters.sortingUnitId = filter.filterValue;
    }
  }

  if (query.batchId) {
    const filter = buildIdFilter(query.batchId);
    if (filter) {
      where.batchId = filter.whereValue;
      filters.batchId = filter.filterValue;
    }
  }

  if (query.catchLocationId) {
    const filter = buildIdFilter(query.catchLocationId);
    if (filter) {
      batchWhere.catchLocationId = filter.whereValue;
      filters.catchLocationId = filter.filterValue;
    }
  }

  if (query.sex) {
    const allowedSexes = ['male', 'female', 'unknown'];
    const sexes = parseIdList(query.sex);

    for (const sex of sexes) {
      if (!allowedSexes.includes(sex)) {
        throw createApiError(400, 'VALIDATION_ERROR', 'sex must be male, female or unknown.');
      }
    }

    if (sexes.length === 1) {
      where.sex = sexes[0];
      filters.sex = sexes[0];
    } else if (sexes.length > 1) {
      where.sex = { [Op.in]: sexes };
      filters.sex = sexes;
    }
  }

  const from = parseDateParam(query.from, 'from');
  const to = parseDateParam(query.to, 'to');

  if (from && to && from > to) {
    throw createApiError(400, 'VALIDATION_ERROR', 'from must be before to.');
  }

  if (from || to) {
    where.observedAt = {};
    filters.observedAt = {};

    if (from) {
      where.observedAt[Op.gte] = from;
      filters.observedAt.from = from.toISOString();
    }

    if (to) {
      where.observedAt[Op.lte] = to;
      filters.observedAt.to = to.toISOString();
    }
  }

  return { where, batchWhere, filters };
}

function toNullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

module.exports = {
  asyncHandler,
  buildObservationWhere,
  createApiError,
  parseDateParam,
  parseIdList,
  parsePagination,
  parsePositiveInteger,
  toNullableNumber
};

'use strict';

const { Op } = require('sequelize');
const { CatchLocation, FishBatch } = require('../../models');
const {
  parseIdList,
  parsePagination
} = require('./helpers');

const includeCatchLocation = [{
  model: CatchLocation,
  as: 'catchLocation',
  attributes: ['id', 'name', 'waterBody', 'municipality', 'latitude', 'longitude', 'description']
}];

function buildBatchWhere(query) {
  const where = {};
  const filters = {};

  if (query.batchId) {
    const ids = parseIdList(query.batchId);
    if (ids.length === 1) {
      where.id = ids[0];
      filters.batchId = ids[0];
    } else if (ids.length > 1) {
      where.id = { [Op.in]: ids };
      filters.batchId = ids;
    }
  }

  if (query.catchLocationId) {
    const ids = parseIdList(query.catchLocationId);
    if (ids.length === 1) {
      where.catchLocationId = ids[0];
      filters.catchLocationId = ids[0];
    } else if (ids.length > 1) {
      where.catchLocationId = { [Op.in]: ids };
      filters.catchLocationId = ids;
    }
  }

  return { where, filters };
}

async function list(req, res) {
  const { where, filters } = buildBatchWhere(req.query);
  const { limit, offset } = parsePagination(req.query);

  const result = await FishBatch.findAndCountAll({
    where,
    include: includeCatchLocation,
    order: [
      ['receivedAt', 'DESC'],
      ['caughtFrom', 'DESC'],
      ['code', 'ASC']
    ],
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

module.exports = {
  list
};

'use strict';

const { col, fn, literal, Op } = require('sequelize');
const { CatchLocation, FishBatch, FishObservation, SortingUnit, Species } = require('../../models');
const {
  buildObservationWhere,
  createApiError,
  parsePositiveInteger,
  toNullableNumber
} = require('./helpers');

const aggregateAttributes = [
  [fn('COUNT', col('FishObservation.id')), 'count'],
  [fn('SUM', col('weightG')), 'totalWeightG'],
  [fn('AVG', col('lengthMm')), 'avgLengthMm'],
  [fn('AVG', col('weightG')), 'avgWeightG']
];

const ALLOWED_METRICS = ['lengthMm', 'weightG', 'aiConfidence'];
const ALLOWED_GRANULARITIES = ['day', 'week', 'month'];
const ALLOWED_GROUP_BY = ['species', 'sortingUnit', 'catchLocation', 'batch', 'sex'];
const SUMMARY_BREAKDOWN = 'speciesSexWeight';
const BREAKDOWN_GROUPS = ['sortingUnit', 'catchLocation', 'batch'];
const EMPTY_GROUP_KEY = '__none__';

function hasBatchFilter(batchWhere) {
  return Object.keys(batchWhere || {}).length > 0;
}

function batchFilterInclude(batchWhere) {
  if (!hasBatchFilter(batchWhere)) {
    return [];
  }

  return [{
    model: FishBatch,
    as: 'batch',
    attributes: [],
    where: batchWhere,
    required: true
  }];
}

function filteredBatchInclude(batchWhere, extra) {
  const hasFilter = hasBatchFilter(batchWhere);

  return Object.assign({
    model: FishBatch,
    as: 'batch',
    required: hasFilter,
    where: hasFilter ? batchWhere : undefined
  }, extra || {});
}

function mapAggregateValues(row) {
  return {
    count: Number(row.count),
    totalWeightG: toNullableNumber(row.totalWeightG),
    totalWeightKg: row.totalWeightG === null || row.totalWeightG === undefined
      ? null
      : Number((Number(row.totalWeightG) / 1000).toFixed(3)),
    avgLengthMm: toNullableNumber(row.avgLengthMm),
    avgWeightG: toNullableNumber(row.avgWeightG)
  };
}

function catchLocationFromRow(row) {
  return row.batch && row.batch.catchLocation && row.batch.catchLocation.id
    ? row.batch.catchLocation
    : null;
}

function catchLocationComparisonInclude(batchWhere) {
  return filteredBatchInclude(batchWhere, {
    attributes: [],
    include: [{
      model: CatchLocation,
      as: 'catchLocation',
      attributes: ['id', 'name']
    }]
  });
}

function groupKey(value) {
  return value === null || value === undefined || value === '' ? EMPTY_GROUP_KEY : String(value);
}

function summaryRowKey(row, groupBy) {
  if (groupBy === 'sortingUnit') {
    return groupKey(row.sortingUnit && row.sortingUnit.id);
  }
  if (groupBy === 'batch') {
    return groupKey(row.batch && row.batch.id);
  }
  if (groupBy === 'catchLocation') {
    return groupKey(row.catchLocation && row.catchLocation.id);
  }

  return EMPTY_GROUP_KEY;
}

function breakdownRowKey(row, groupBy) {
  if (groupBy === 'sortingUnit') {
    return groupKey(row.sortingUnit && row.sortingUnit.id);
  }
  if (groupBy === 'batch') {
    return groupKey(row.batch && row.batch.id);
  }
  if (groupBy === 'catchLocation') {
    return groupKey(row.batch && row.batch.catchLocation && row.batch.catchLocation.id);
  }

  return EMPTY_GROUP_KEY;
}

function sortBreakdownRows(a, b) {
  if (b.count !== a.count) {
    return b.count - a.count;
  }

  const speciesA = a.species ? a.species.finnishName : '';
  const speciesB = b.species ? b.species.finnishName : '';
  const speciesOrder = speciesA.localeCompare(speciesB);
  if (speciesOrder !== 0) {
    return speciesOrder;
  }

  const sexOrder = String(a.sex || '').localeCompare(String(b.sex || ''));
  if (sexOrder !== 0) {
    return sexOrder;
  }

  return Number(a.weightG || 0) - Number(b.weightG || 0);
}

async function buildSummaryBreakdown(groupBy, where, batchWhere) {
  if (!BREAKDOWN_GROUPS.includes(groupBy)) {
    return new Map();
  }

  const attributes = [
    ['sex', 'sex'],
    ['weightG', 'weightG'],
    [fn('COUNT', col('FishObservation.id')), 'count']
  ];
  const include = [{
    model: Species,
    as: 'species',
    attributes: ['id', 'finnishName'],
    required: false
  }];
  const group = [
    col('species.id'),
    col('species.finnishName'),
    'sex',
    'weightG'
  ];

  if (groupBy === 'sortingUnit') {
    include.push({
      model: SortingUnit,
      as: 'sortingUnit',
      attributes: ['id'],
      required: false
    });
    include.push(...batchFilterInclude(batchWhere));
    group.push(col('sortingUnit.id'));
  }

  if (groupBy === 'batch') {
    include.push(filteredBatchInclude(batchWhere, {
      attributes: ['id']
    }));
    group.push(col('batch.id'));
  }

  if (groupBy === 'catchLocation') {
    include.push(filteredBatchInclude(batchWhere, {
      attributes: [],
      include: [{
        model: CatchLocation,
        as: 'catchLocation',
        attributes: ['id']
      }]
    }));
    group.push(col('batch.catchLocation.id'));
  }

  const rows = await FishObservation.findAll({
    where,
    attributes,
    include,
    group,
    raw: true,
    nest: true
  });

  const breakdown = new Map();

  rows.forEach((row) => {
    const key = breakdownRowKey(row, groupBy);
    const items = breakdown.get(key) || [];

    items.push({
      species: row.species && row.species.id ? row.species : null,
      sex: row.sex || 'unknown',
      weightG: toNullableNumber(row.weightG),
      count: Number(row.count)
    });

    breakdown.set(key, items);
  });

  breakdown.forEach((items) => {
    items.sort(sortBreakdownRows);
  });

  return breakdown;
}

async function attachSummaryBreakdown(req, groupBy, data, where, batchWhere) {
  if (req.query.breakdown !== SUMMARY_BREAKDOWN || !BREAKDOWN_GROUPS.includes(groupBy)) {
    return data;
  }

  const breakdown = await buildSummaryBreakdown(groupBy, where, batchWhere);

  return data.map((row) => ({
    ...row,
    breakdown: breakdown.get(summaryRowKey(row, groupBy)) || []
  }));
}

async function buildTimelineBreakdown(granularity, where, batchWhere) {
  const bucketExpr = bucketExpression(granularity);
  const rows = await FishObservation.findAll({
    where,
    attributes: [
      [bucketExpr, 'bucket'],
      ['sex', 'sex'],
      ['weightG', 'weightG'],
      [fn('COUNT', col('FishObservation.id')), 'count']
    ],
    include: [{
      model: Species,
      as: 'species',
      attributes: ['id', 'finnishName'],
      required: false
    }].concat(batchFilterInclude(batchWhere)),
    group: [
      literal('bucket'),
      col('species.id'),
      col('species.finnishName'),
      'sex',
      'weightG'
    ],
    order: [literal('bucket ASC')],
    raw: true,
    nest: true
  });

  const breakdown = new Map();

  rows.forEach((row) => {
    const items = breakdown.get(row.bucket) || [];
    items.push({
      species: row.species && row.species.id ? row.species : null,
      sex: row.sex || 'unknown',
      weightG: toNullableNumber(row.weightG),
      count: Number(row.count)
    });
    breakdown.set(row.bucket, items);
  });

  breakdown.forEach((items) => {
    items.sort(sortBreakdownRows);
  });

  return breakdown;
}

async function attachTimelineBreakdown(req, data, granularity, where, batchWhere) {
  if (req.query.breakdown !== SUMMARY_BREAKDOWN) {
    return data;
  }

  const breakdown = await buildTimelineBreakdown(granularity, where, batchWhere);

  return data.map((row) => ({
    ...row,
    breakdown: breakdown.get(row.bucket) || []
  }));
}

function bucketFormat(granularity) {
  if (granularity === 'month') {
    return '%Y-%m-01';
  }
  if (granularity === 'week') {
    // ISO-week start (Monday). DATE_FORMAT does not have ISO-week directly,
    // so subtract WEEKDAY (0=Mon..6=Sun) from the date and format as Y-m-d.
    return null;
  }
  return '%Y-%m-%d';
}

function bucketExpression(granularity) {
  if (granularity === 'week') {
    return literal('DATE_FORMAT(DATE_SUB(`FishObservation`.`observedAt`, INTERVAL WEEKDAY(`FishObservation`.`observedAt`) DAY), \'%Y-%m-%d\')');
  }

  return fn('DATE_FORMAT', col('FishObservation.observedAt'), bucketFormat(granularity));
}

async function count(req, res) {
  const { where, batchWhere, filters } = buildObservationWhere(req.query);
  const totals = await FishObservation.findOne({
    where,
    include: batchFilterInclude(batchWhere),
    attributes: aggregateAttributes,
    raw: true
  });

  res.json({
    data: mapAggregateValues(totals),
    filters
  });
}

async function summary(req, res) {
  const { where, batchWhere, filters } = buildObservationWhere(req.query);
  const groupBy = req.query.groupBy === 'location' ? 'sortingUnit' : (req.query.groupBy || 'species');
  const filterInclude = batchFilterInclude(batchWhere);

  if (!ALLOWED_GROUP_BY.includes(groupBy)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'groupBy must be species, sortingUnit, catchLocation, batch or sex.');
  }

  if (groupBy === 'sex') {
    const rows = await FishObservation.findAll({
      where,
      attributes: ['sex'].concat(aggregateAttributes),
      include: filterInclude,
      group: ['sex'],
      order: [['sex', 'ASC']],
      raw: true
    });

    return res.json({
      data: rows.map((row) => ({
        sex: row.sex,
        ...mapAggregateValues(row)
      })),
      groupBy,
      filters
    });
  }

  if (groupBy === 'sortingUnit') {
    const rows = await FishObservation.findAll({
      where,
      attributes: aggregateAttributes,
      include: [{
        model: SortingUnit,
        as: 'sortingUnit',
        attributes: ['id', 'name', 'municipality'],
        required: false
      }].concat(filterInclude),
      group: [col('sortingUnit.id'), col('sortingUnit.name'), col('sortingUnit.municipality')],
      raw: true,
      nest: true
    });

    let data = rows
      .map((row) => ({
        sortingUnit: row.sortingUnit && row.sortingUnit.id ? row.sortingUnit : null,
        ...mapAggregateValues(row)
      }))
      .sort((a, b) => {
        const nameA = a.sortingUnit ? a.sortingUnit.name : '';
        const nameB = b.sortingUnit ? b.sortingUnit.name : '';
        return nameA.localeCompare(nameB);
      });
    data = await attachSummaryBreakdown(req, groupBy, data, where, batchWhere);

    return res.json({ data, groupBy, filters });
  }

  if (groupBy === 'batch') {
    const rows = await FishObservation.findAll({
      where,
      attributes: aggregateAttributes,
      include: [filteredBatchInclude(batchWhere, {
        attributes: ['id', 'code']
      })],
      group: [col('batch.id'), col('batch.code')],
      raw: true,
      nest: true
    });

    let data = rows
      .map((row) => ({
        batch: row.batch && row.batch.id ? row.batch : null,
        ...mapAggregateValues(row)
      }))
      .sort((a, b) => {
        const codeA = a.batch ? a.batch.code : '';
        const codeB = b.batch ? b.batch.code : '';
        return codeA.localeCompare(codeB);
      });
    data = await attachSummaryBreakdown(req, groupBy, data, where, batchWhere);

    return res.json({ data, groupBy, filters });
  }

  if (groupBy === 'catchLocation') {
    const rows = await FishObservation.findAll({
      where,
      attributes: aggregateAttributes,
      include: [filteredBatchInclude(batchWhere, {
        attributes: [],
        include: [{
          model: CatchLocation,
          as: 'catchLocation',
          attributes: ['id', 'name']
        }]
      })],
      group: [col('batch.catchLocation.id'), col('batch.catchLocation.name')],
      raw: true,
      nest: true
    });

    let data = rows
      .map((row) => ({
        catchLocation: row.batch && row.batch.catchLocation && row.batch.catchLocation.id
          ? row.batch.catchLocation
          : null,
        ...mapAggregateValues(row)
      }))
      .sort((a, b) => {
        const nameA = a.catchLocation ? a.catchLocation.name : '';
        const nameB = b.catchLocation ? b.catchLocation.name : '';
        return nameA.localeCompare(nameB);
      });
    data = await attachSummaryBreakdown(req, groupBy, data, where, batchWhere);

    return res.json({ data, groupBy, filters });
  }

  const rows = await FishObservation.findAll({
    where,
    attributes: aggregateAttributes,
    include: [{
      model: Species,
      as: 'species',
      attributes: ['id', 'finnishName']
    }].concat(filterInclude),
    group: [col('species.id'), col('species.finnishName')],
    raw: true,
    nest: true
  });

  const data = rows
    .map((row) => ({
      species: row.species,
      ...mapAggregateValues(row)
    }))
    .sort((a, b) => a.species.finnishName.localeCompare(b.species.finnishName));

  res.json({ data, groupBy, filters });
}

async function timeline(req, res) {
  const { where, batchWhere, filters } = buildObservationWhere(req.query);
  const granularity = req.query.granularity || 'day';
  const filterInclude = batchFilterInclude(batchWhere);

  if (!ALLOWED_GRANULARITIES.includes(granularity)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'granularity must be day, week or month.');
  }

  const groupBy = req.query.groupBy === 'location' ? 'sortingUnit' : (req.query.groupBy || null);
  if (groupBy && !ALLOWED_GROUP_BY.includes(groupBy)) {
    throw createApiError(400, 'VALIDATION_ERROR', 'groupBy must be species, sortingUnit, catchLocation, batch or sex.');
  }

  const bucketExpr = bucketExpression(granularity);
  const baseAttributes = [
    [bucketExpr, 'bucket'],
    [fn('COUNT', col('FishObservation.id')), 'count'],
    [fn('SUM', col('weightG')), 'totalWeightG'],
    [fn('AVG', col('lengthMm')), 'avgLengthMm']
  ];

  if (!groupBy) {
    const rows = await FishObservation.findAll({
      where,
      attributes: baseAttributes,
      include: filterInclude,
      group: [literal('bucket')],
      order: [literal('bucket ASC')],
      raw: true
    });

    let data = rows.map((row) => ({
      bucket: row.bucket,
      count: Number(row.count),
      totalWeightG: toNullableNumber(row.totalWeightG),
      avgLengthMm: toNullableNumber(row.avgLengthMm)
    }));
    data = await attachTimelineBreakdown(req, data, granularity, where, batchWhere);

    return res.json({
      data,
      granularity,
      groupBy: null,
      filters
    });
  }

  if (groupBy === 'sex') {
    const rows = await FishObservation.findAll({
      where,
      attributes: baseAttributes.concat([['sex', 'sex']]),
      include: filterInclude,
      group: [literal('bucket'), 'sex'],
      order: [literal('bucket ASC')],
      raw: true
    });

    return res.json({
      data: rows.map((row) => ({
        bucket: row.bucket,
        group: { type: 'sex', value: row.sex },
        count: Number(row.count),
        totalWeightG: toNullableNumber(row.totalWeightG),
        avgLengthMm: toNullableNumber(row.avgLengthMm)
      })),
      granularity,
      groupBy,
      filters
    });
  }

  if (groupBy === 'sortingUnit') {
    const rows = await FishObservation.findAll({
      where,
      attributes: baseAttributes,
      include: [{
        model: SortingUnit,
        as: 'sortingUnit',
        attributes: ['id', 'name', 'municipality'],
        required: false
      }].concat(filterInclude),
      group: [literal('bucket'), col('sortingUnit.id'), col('sortingUnit.name'), col('sortingUnit.municipality')],
      order: [literal('bucket ASC')],
      raw: true,
      nest: true
    });

    return res.json({
      data: rows.map((row) => ({
        bucket: row.bucket,
        group: row.sortingUnit && row.sortingUnit.id
          ? {
            type: 'sortingUnit',
            id: row.sortingUnit.id,
            name: row.sortingUnit.name,
            municipality: row.sortingUnit.municipality
          }
          : { type: 'sortingUnit', id: null, name: null },
        count: Number(row.count),
        totalWeightG: toNullableNumber(row.totalWeightG),
        avgLengthMm: toNullableNumber(row.avgLengthMm)
      })),
      granularity,
      groupBy,
      filters
    });
  }

  if (groupBy === 'batch') {
    const rows = await FishObservation.findAll({
      where,
      attributes: baseAttributes,
      include: [filteredBatchInclude(batchWhere, {
        attributes: ['id', 'code']
      })],
      group: [literal('bucket'), col('batch.id'), col('batch.code')],
      order: [literal('bucket ASC')],
      raw: true,
      nest: true
    });

    return res.json({
      data: rows.map((row) => ({
        bucket: row.bucket,
        group: row.batch && row.batch.id
          ? { type: 'batch', id: row.batch.id, name: row.batch.code }
          : { type: 'batch', id: null, name: null },
        count: Number(row.count),
        totalWeightG: toNullableNumber(row.totalWeightG),
        avgLengthMm: toNullableNumber(row.avgLengthMm)
      })),
      granularity,
      groupBy,
      filters
    });
  }

  if (groupBy === 'catchLocation') {
    const rows = await FishObservation.findAll({
      where,
      attributes: baseAttributes,
      include: [filteredBatchInclude(batchWhere, {
        attributes: [],
        include: [{
          model: CatchLocation,
          as: 'catchLocation',
          attributes: ['id', 'name']
        }]
      })],
      group: [literal('bucket'), col('batch.catchLocation.id'), col('batch.catchLocation.name')],
      order: [literal('bucket ASC')],
      raw: true,
      nest: true
    });

    return res.json({
      data: rows.map((row) => ({
        bucket: row.bucket,
        group: row.batch && row.batch.catchLocation && row.batch.catchLocation.id
          ? { type: 'catchLocation', id: row.batch.catchLocation.id, name: row.batch.catchLocation.name }
          : { type: 'catchLocation', id: null, name: null },
        count: Number(row.count),
        totalWeightG: toNullableNumber(row.totalWeightG),
        avgLengthMm: toNullableNumber(row.avgLengthMm)
      })),
      granularity,
      groupBy,
      filters
    });
  }

  const rows = await FishObservation.findAll({
    where,
    attributes: baseAttributes,
    include: [{
      model: Species,
      as: 'species',
      attributes: ['id', 'finnishName']
    }].concat(filterInclude),
    group: [literal('bucket'), col('species.id'), col('species.finnishName')],
    order: [literal('bucket ASC')],
    raw: true,
    nest: true
  });

  res.json({
    data: rows.map((row) => ({
      bucket: row.bucket,
      group: { type: 'species', id: row.species.id, name: row.species.finnishName },
      count: Number(row.count),
      totalWeightG: toNullableNumber(row.totalWeightG),
      avgLengthMm: toNullableNumber(row.avgLengthMm)
    })),
    granularity,
    groupBy,
    filters
  });
}

async function comparison(req, res) {
  const dimension = req.query.dimension || 'catchLocation';

  if (dimension !== 'catchLocation') {
    throw createApiError(400, 'VALIDATION_ERROR', 'dimension must be catchLocation.');
  }

  const { where, batchWhere, filters } = buildObservationWhere(req.query);

  const [speciesRows, sexRows] = await Promise.all([
    FishObservation.findAll({
      where,
      attributes: aggregateAttributes,
      include: [{
        model: Species,
        as: 'species',
        attributes: ['id', 'finnishName'],
        required: false
      }, catchLocationComparisonInclude(batchWhere)],
      group: [
        col('batch.catchLocation.id'),
        col('batch.catchLocation.name'),
        col('species.id'),
        col('species.finnishName')
      ],
      raw: true,
      nest: true
    }),
    FishObservation.findAll({
      where,
      attributes: [
        ['sex', 'sex'],
        [fn('COUNT', col('FishObservation.id')), 'count']
      ],
      include: [catchLocationComparisonInclude(batchWhere)],
      group: [
        col('batch.catchLocation.id'),
        col('batch.catchLocation.name'),
        'sex'
      ],
      raw: true,
      nest: true
    })
  ]);

  const speciesByCatchLocation = speciesRows
    .map((row) => ({
      catchLocation: catchLocationFromRow(row),
      species: row.species && row.species.id ? row.species : null,
      ...mapAggregateValues(row)
    }))
    .filter((row) => row.catchLocation && row.species)
    .sort((a, b) => {
      const locationOrder = a.catchLocation.name.localeCompare(b.catchLocation.name);
      if (locationOrder !== 0) {
        return locationOrder;
      }
      return a.species.finnishName.localeCompare(b.species.finnishName);
    });

  const sexByCatchLocation = sexRows
    .map((row) => ({
      catchLocation: catchLocationFromRow(row),
      sex: row.sex || 'unknown',
      count: Number(row.count)
    }))
    .filter((row) => row.catchLocation)
    .sort((a, b) => {
      const locationOrder = a.catchLocation.name.localeCompare(b.catchLocation.name);
      if (locationOrder !== 0) {
        return locationOrder;
      }
      return String(a.sex).localeCompare(String(b.sex));
    });

  res.json({
    data: {
      speciesByCatchLocation,
      sexByCatchLocation
    },
    dimension,
    filters
  });
}

function percentile(sorted, p) {
  if (!sorted.length) {
    return null;
  }

  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);

  if (lower === upper) {
    return sorted[lower];
  }

  const fraction = rank - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

async function distribution(req, res) {
  const metric = req.query.metric;

  if (!metric) {
    throw createApiError(400, 'VALIDATION_ERROR', 'metric is required.');
  }

  if (!ALLOWED_METRICS.includes(metric)) {
    throw createApiError(400, 'VALIDATION_ERROR', `metric must be one of ${ALLOWED_METRICS.join(', ')}.`);
  }

  const bins = parsePositiveInteger(req.query.bins, 'bins', 20, 100) || 20;
  const { where, batchWhere, filters } = buildObservationWhere(req.query);

  const whereWithMetric = { ...where, [metric]: { [Op.ne]: null } };

  const rows = await FishObservation.findAll({
    where: whereWithMetric,
    include: batchFilterInclude(batchWhere),
    attributes: [metric],
    raw: true
  });

  const values = rows
    .map((row) => Number(row[metric]))
    .filter((v) => Number.isFinite(v));

  if (values.length === 0) {
    return res.json({
      data: {
        metric,
        bins: [],
        min: null,
        max: null,
        p25: null,
        p50: null,
        p75: null,
        n: 0
      },
      filters
    });
  }

  const sorted = values.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const span = max - min;

  const binData = [];

  if (span === 0) {
    binData.push({ binStart: min, binEnd: max, count: values.length });
  } else {
    const step = span / bins;
    const counts = new Array(bins).fill(0);

    for (const value of values) {
      let index = Math.floor((value - min) / step);
      if (index >= bins) {
        index = bins - 1;
      }
      counts[index]++;
    }

    for (let i = 0; i < bins; i++) {
      binData.push({
        binStart: min + i * step,
        binEnd: i === bins - 1 ? max : min + (i + 1) * step,
        count: counts[i]
      });
    }
  }

  res.json({
    data: {
      metric,
      bins: binData,
      min,
      max,
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      n: values.length
    },
    filters
  });
}

module.exports = {
  comparison,
  count,
  distribution,
  summary,
  timeline
};

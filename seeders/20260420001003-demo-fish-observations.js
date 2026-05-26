'use strict';

const now = new Date();

const observations = [
  {
    id: '90000000-0000-4000-8000-000000000001',
    observedAt: new Date('2026-04-19T06:15:00.000Z'),
    speciesId: '11111111-1111-4111-8111-111111111111',
    sex: 'male',
    lengthMm: 720,
    weightG: 2850,
    sortingUnitId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.9421,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1042 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000002',
    observedAt: new Date('2026-04-19T07:45:00.000Z'),
    speciesId: '11111111-1111-4111-8111-111111111111',
    sex: 'female',
    lengthMm: 810,
    weightG: 4100,
    sortingUnitId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.9175,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1189 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000003',
    observedAt: new Date('2026-04-19T09:10:00.000Z'),
    speciesId: '22222222-2222-4222-8222-222222222222',
    sex: 'unknown',
    lengthMm: 245,
    weightG: 260,
    sortingUnitId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.8842,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1305 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000004',
    observedAt: new Date('2026-04-19T10:30:00.000Z'),
    speciesId: '33333333-3333-4333-8333-333333333333',
    sex: 'male',
    lengthMm: 540,
    weightG: 1650,
    sortingUnitId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.9633,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1448 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000005',
    observedAt: new Date('2026-04-19T12:05:00.000Z'),
    speciesId: '33333333-3333-4333-8333-333333333333',
    sex: 'female',
    lengthMm: 610,
    weightG: 2300,
    sortingUnitId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.9368,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1582 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000006',
    observedAt: new Date('2026-04-19T13:20:00.000Z'),
    speciesId: '44444444-4444-4444-8444-444444444444',
    sex: 'unknown',
    lengthMm: 690,
    weightG: 3400,
    sortingUnitId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.8014,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1701 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000007',
    observedAt: new Date('2026-04-19T15:55:00.000Z'),
    speciesId: '55555555-5555-4555-8555-555555555555',
    sex: 'female',
    lengthMm: 420,
    weightG: 890,
    sortingUnitId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    batchId: 'ba111111-1111-4111-8111-111111111111',
    aiConfidence: 0.9022,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 1944 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000008',
    observedAt: new Date('2026-04-20T05:40:00.000Z'),
    speciesId: '11111111-1111-4111-8111-111111111111',
    sex: 'male',
    lengthMm: 760,
    weightG: 3200,
    sortingUnitId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    batchId: 'ba222222-2222-4222-8222-222222222222',
    aiConfidence: 0.9549,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 2048 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000009',
    observedAt: new Date('2026-04-20T08:25:00.000Z'),
    speciesId: '22222222-2222-4222-8222-222222222222',
    sex: 'male',
    lengthMm: 310,
    weightG: 420,
    sortingUnitId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    batchId: 'ba222222-2222-4222-8222-222222222222',
    aiConfidence: 0.9219,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 2217 }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: '90000000-0000-4000-8000-000000000010',
    observedAt: new Date('2026-04-20T11:00:00.000Z'),
    speciesId: '55555555-5555-4555-8555-555555555555',
    sex: 'unknown',
    lengthMm: 455,
    weightG: 1020,
    sortingUnitId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    batchId: 'ba222222-2222-4222-8222-222222222222',
    aiConfidence: 0.8766,
    metadata: JSON.stringify({ source: 'demo', imageFrame: 2381 }),
    createdAt: now,
    updatedAt: now
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('fish_observations', observations, {
      updateOnDuplicate: [
        'observedAt',
        'speciesId',
        'sex',
        'lengthMm',
        'weightG',
        'sortingUnitId',
        'batchId',
        'aiConfidence',
        'metadata',
        'updatedAt'
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('fish_observations', {
      id: observations.map((item) => item.id)
    });
  }
};

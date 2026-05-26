'use strict';

const now = new Date();

const batches = [
  {
    id: 'ba111111-1111-4111-8111-111111111111',
    code: 'ERA-2026-04-19-A',
    catchLocationId: 'ca111111-1111-4111-8111-111111111111',
    caughtFrom: new Date('2026-04-19T04:00:00.000Z'),
    caughtTo: new Date('2026-04-19T12:00:00.000Z'),
    receivedAt: new Date('2026-04-19T13:00:00.000Z'),
    description: 'Demodatan aamuerä.',
    metadata: JSON.stringify({ source: 'demo' }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'ba222222-2222-4222-8222-222222222222',
    code: 'ERA-2026-04-20-B',
    catchLocationId: 'ca222222-2222-4222-8222-222222222222',
    caughtFrom: new Date('2026-04-20T03:30:00.000Z'),
    caughtTo: new Date('2026-04-20T10:30:00.000Z'),
    receivedAt: new Date('2026-04-20T11:30:00.000Z'),
    description: 'Demodatan seuraavan päivän erä.',
    metadata: JSON.stringify({ source: 'demo' }),
    createdAt: now,
    updatedAt: now
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('fish_batches', batches, {
      updateOnDuplicate: [
        'code',
        'catchLocationId',
        'caughtFrom',
        'caughtTo',
        'receivedAt',
        'description',
        'metadata',
        'updatedAt'
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('fish_batches', {
      id: batches.map((item) => item.id)
    });
  }
};

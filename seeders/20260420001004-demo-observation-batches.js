'use strict';

const firstBatchObservationIds = [
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000003',
  '90000000-0000-4000-8000-000000000004',
  '90000000-0000-4000-8000-000000000005',
  '90000000-0000-4000-8000-000000000006',
  '90000000-0000-4000-8000-000000000007'
];

const secondBatchObservationIds = [
  '90000000-0000-4000-8000-000000000008',
  '90000000-0000-4000-8000-000000000009',
  '90000000-0000-4000-8000-000000000010'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('fish_observations', {
      batchId: 'ba111111-1111-4111-8111-111111111111',
      updatedAt: new Date()
    }, {
      id: firstBatchObservationIds
    });

    await queryInterface.bulkUpdate('fish_observations', {
      batchId: 'ba222222-2222-4222-8222-222222222222',
      updatedAt: new Date()
    }, {
      id: secondBatchObservationIds
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('fish_observations', {
      batchId: null,
      updatedAt: new Date()
    }, {
      id: firstBatchObservationIds.concat(secondBatchObservationIds)
    });
  }
};

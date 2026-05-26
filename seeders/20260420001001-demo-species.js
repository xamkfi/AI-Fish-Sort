'use strict';

const now = new Date();

const species = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    finnishName: 'Hauki',
    createdAt: now,
    updatedAt: now
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    finnishName: 'Ahven',
    createdAt: now,
    updatedAt: now
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    finnishName: 'Kuha',
    createdAt: now,
    updatedAt: now
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    finnishName: 'Lohi',
    createdAt: now,
    updatedAt: now
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    finnishName: 'Siika',
    createdAt: now,
    updatedAt: now
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('species', species, {
      updateOnDuplicate: ['finnishName', 'updatedAt']
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('species', {
      id: species.map((item) => item.id)
    });
  }
};

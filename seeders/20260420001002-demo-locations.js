'use strict';

const now = new Date();

const sortingUnits = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Linja A',
    municipality: 'Tampere',
    description: 'Pääsyötön lajittelulinja',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Linja B',
    municipality: 'Tampere',
    description: 'Toissijainen lajittelulinja',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Vastaanottoallas',
    municipality: 'Tampere',
    description: 'Kalojen ensimmäinen havaintopiste',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    name: 'Poistopiste',
    municipality: 'Tampere',
    description: 'Lajittelun jälkeinen poistopiste',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'Testikamera',
    municipality: 'Tampere',
    description: 'Kehitysympäristön testilajitteluyksikkö',
    createdAt: now,
    updatedAt: now
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('sorting_units', sortingUnits, {
      updateOnDuplicate: ['name', 'municipality', 'description', 'updatedAt']
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sorting_units', {
      id: sortingUnits.map((item) => item.id)
    });
  }
};

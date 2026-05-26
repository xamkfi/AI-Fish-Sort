'use strict';

const now = new Date();

const catchLocations = [
  {
    id: 'ca111111-1111-4111-8111-111111111111',
    name: 'Pyhäjärven pohjoinen selkä',
    waterBody: 'Pyhäjärvi',
    municipality: 'Tampere',
    latitude: 61.4511000,
    longitude: 23.7589000,
    description: 'Demodatan pyyntialue Pyhäjärven pohjoisosassa.',
    metadata: JSON.stringify({ source: 'demo' }),
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'ca222222-2222-4222-8222-222222222222',
    name: 'Näsijärven rantavyöhyke',
    waterBody: 'Näsijärvi',
    municipality: 'Tampere',
    latitude: 61.5233000,
    longitude: 23.7456000,
    description: 'Demodatan pyyntialue Näsijärven eteläosassa.',
    metadata: JSON.stringify({ source: 'demo' }),
    createdAt: now,
    updatedAt: now
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('catch_locations', catchLocations, {
      updateOnDuplicate: [
        'name',
        'waterBody',
        'municipality',
        'latitude',
        'longitude',
        'description',
        'metadata',
        'updatedAt'
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('catch_locations', {
      id: catchLocations.map((item) => item.id)
    });
  }
};

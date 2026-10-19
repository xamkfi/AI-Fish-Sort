'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('species', 'scientificName', {
      type: Sequelize.STRING(200),
      allowNull: true,
      after: 'finnishName'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('species', 'scientificName');
  }
};

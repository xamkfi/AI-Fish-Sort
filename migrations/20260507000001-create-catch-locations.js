'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('catch_locations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING(160)
      },
      waterBody: {
        allowNull: true,
        type: Sequelize.STRING(160)
      },
      municipality: {
        allowNull: true,
        type: Sequelize.STRING(120)
      },
      latitude: {
        allowNull: true,
        type: Sequelize.DECIMAL(10, 7)
      },
      longitude: {
        allowNull: true,
        type: Sequelize.DECIMAL(10, 7)
      },
      description: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      metadata: {
        allowNull: true,
        type: Sequelize.JSON
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('catch_locations', ['name']);
    await queryInterface.addIndex('catch_locations', ['waterBody']);
    await queryInterface.addIndex('catch_locations', ['municipality']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('catch_locations');
  }
};

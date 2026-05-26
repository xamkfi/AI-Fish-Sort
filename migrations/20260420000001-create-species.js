'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('species', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      finnishName: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(120)
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('species');
  }
};

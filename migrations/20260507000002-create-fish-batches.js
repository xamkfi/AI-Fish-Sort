'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fish_batches', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      code: {
        allowNull: false,
        type: Sequelize.STRING(80)
      },
      catchLocationId: {
        allowNull: true,
        type: Sequelize.UUID,
        references: {
          model: 'catch_locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      caughtFrom: {
        allowNull: true,
        type: Sequelize.DATE
      },
      caughtTo: {
        allowNull: true,
        type: Sequelize.DATE
      },
      receivedAt: {
        allowNull: true,
        type: Sequelize.DATE
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

    await queryInterface.addIndex('fish_batches', ['code'], { unique: true });
    await queryInterface.addIndex('fish_batches', ['catchLocationId']);
    await queryInterface.addIndex('fish_batches', ['caughtFrom']);
    await queryInterface.addIndex('fish_batches', ['receivedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fish_batches');
  }
};

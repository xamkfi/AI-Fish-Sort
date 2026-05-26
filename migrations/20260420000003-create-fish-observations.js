'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fish_observations', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      observedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      speciesId: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: 'species',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      sex: {
        allowNull: false,
        type: Sequelize.ENUM('male', 'female', 'unknown'),
        defaultValue: 'unknown'
      },
      lengthMm: {
        allowNull: true,
        type: Sequelize.INTEGER
      },
      weightG: {
        allowNull: true,
        type: Sequelize.INTEGER
      },
      locationId: {
        allowNull: true,
        type: Sequelize.UUID,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      aiConfidence: {
        allowNull: true,
        type: Sequelize.DECIMAL(5, 4)
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

    await queryInterface.addIndex('fish_observations', ['observedAt']);
    await queryInterface.addIndex('fish_observations', ['speciesId']);
    await queryInterface.addIndex('fish_observations', ['locationId']);
    await queryInterface.addIndex('fish_observations', ['sex']);
    await queryInterface.addIndex('fish_observations', ['speciesId', 'observedAt']);
    await queryInterface.addIndex('fish_observations', ['locationId', 'observedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('fish_observations');
  }
};

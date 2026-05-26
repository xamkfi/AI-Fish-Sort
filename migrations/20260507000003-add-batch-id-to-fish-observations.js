'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('fish_observations', 'batchId', {
      allowNull: true,
      type: Sequelize.UUID,
      references: {
        model: 'fish_batches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('fish_observations', ['batchId']);
    await queryInterface.addIndex('fish_observations', ['batchId', 'observedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('fish_observations', ['batchId', 'observedAt']);
    await queryInterface.removeIndex('fish_observations', ['batchId']);
    await queryInterface.removeColumn('fish_observations', 'batchId');
  }
};

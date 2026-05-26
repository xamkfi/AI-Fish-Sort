'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FishBatch extends Model {
    static associate(models) {
      FishBatch.belongsTo(models.CatchLocation, {
        foreignKey: 'catchLocationId',
        as: 'catchLocation'
      });
      FishBatch.hasMany(models.FishObservation, {
        foreignKey: 'batchId',
        as: 'observations'
      });
    }
  }

  FishBatch.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    catchLocationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    caughtFrom: {
      type: DataTypes.DATE,
      allowNull: true
    },
    caughtTo: {
      type: DataTypes.DATE,
      allowNull: true
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FishBatch',
    tableName: 'fish_batches'
  });

  return FishBatch;
};

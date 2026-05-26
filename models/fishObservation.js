'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FishObservation extends Model {
    static associate(models) {
      FishObservation.belongsTo(models.Species, {
        foreignKey: 'speciesId',
        as: 'species'
      });
      FishObservation.belongsTo(models.SortingUnit, {
        foreignKey: 'sortingUnitId',
        as: 'sortingUnit'
      });
      FishObservation.belongsTo(models.FishBatch, {
        foreignKey: 'batchId',
        as: 'batch'
      });
    }
  }

  FishObservation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    observedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    speciesId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    sex: {
      type: DataTypes.ENUM('male', 'female', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown'
    },
    lengthMm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    weightG: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    sortingUnitId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    aiConfidence: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FishObservation',
    tableName: 'fish_observations'
  });

  return FishObservation;
};

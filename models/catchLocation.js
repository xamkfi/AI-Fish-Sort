'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CatchLocation extends Model {
    static associate(models) {
      CatchLocation.hasMany(models.FishBatch, {
        foreignKey: 'catchLocationId',
        as: 'batches'
      });
    }
  }

  CatchLocation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    waterBody: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    municipality: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
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
    modelName: 'CatchLocation',
    tableName: 'catch_locations'
  });

  return CatchLocation;
};

'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SortingUnit extends Model {
    static associate(models) {
      SortingUnit.hasMany(models.FishObservation, {
        foreignKey: 'sortingUnitId',
        as: 'observations'
      });
    }
  }

  SortingUnit.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    municipality: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SortingUnit',
    tableName: 'sorting_units'
  });

  return SortingUnit;
};

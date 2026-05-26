'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Species extends Model {
    static associate(models) {
      Species.hasMany(models.FishObservation, {
        foreignKey: 'speciesId',
        as: 'observations'
      });
    }
  }

  Species.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    finnishName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Species',
    tableName: 'species'
  });

  return Species;
};

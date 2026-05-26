'use strict';

const { CatchLocation } = require('../../models');

async function list(req, res) {
  const catchLocations = await CatchLocation.findAll({
    attributes: [
      'id',
      'name',
      'waterBody',
      'municipality',
      'latitude',
      'longitude',
      'description',
      'metadata',
      'createdAt',
      'updatedAt'
    ],
    order: [['name', 'ASC']]
  });

  res.json({ data: catchLocations });
}

module.exports = {
  list
};

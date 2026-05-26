'use strict';

const { SortingUnit } = require('../../models');

async function list(req, res) {
  const sortingUnits = await SortingUnit.findAll({
    attributes: ['id', 'name', 'municipality', 'description', 'createdAt', 'updatedAt'],
    order: [['name', 'ASC']]
  });

  res.json({ data: sortingUnits });
}

module.exports = {
  list
};

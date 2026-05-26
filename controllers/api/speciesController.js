'use strict';

const { Species } = require('../../models');

async function list(req, res) {
  const species = await Species.findAll({
    attributes: ['id', 'finnishName', 'createdAt', 'updatedAt'],
    order: [['finnishName', 'ASC']]
  });

  res.json({ data: species });
}

module.exports = {
  list
};

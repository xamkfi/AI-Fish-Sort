'use strict';

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => String(table) === tableName);
}

async function columnExists(queryInterface, tableName, columnName) {
  if (!await tableExists(queryInterface, tableName)) {
    return false;
  }

  const columns = await queryInterface.describeTable(tableName);
  return Boolean(columns[columnName]);
}

async function indexExists(queryInterface, tableName, indexName) {
  const [indexes] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
  return indexes.some((index) => index.Key_name === indexName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!await tableExists(queryInterface, 'sorting_units')) {
      return;
    }

    const demoSortingUnitIds = [
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    ];

    if (!await columnExists(queryInterface, 'sorting_units', 'municipality')) {
      await queryInterface.addColumn('sorting_units', 'municipality', {
        allowNull: true,
        type: Sequelize.STRING(120),
        after: 'name'
      });
    }

    await queryInterface.bulkUpdate('sorting_units', {
      municipality: 'Tampere',
      updatedAt: new Date()
    }, {
      id: { [Sequelize.Op.in]: demoSortingUnitIds },
      municipality: null
    });

    if (!await indexExists(queryInterface, 'sorting_units', 'sorting_units_municipality')) {
      await queryInterface.addIndex('sorting_units', ['municipality'], {
        name: 'sorting_units_municipality'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'sorting_units')
      && await indexExists(queryInterface, 'sorting_units', 'sorting_units_municipality')) {
      await queryInterface.removeIndex('sorting_units', 'sorting_units_municipality');
    }

    if (await columnExists(queryInterface, 'sorting_units', 'municipality')) {
      await queryInterface.removeColumn('sorting_units', 'municipality');
    }
  }
};

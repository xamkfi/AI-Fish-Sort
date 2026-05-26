'use strict';

async function findForeignKey(queryInterface, tableName, columnName) {
  const references = await queryInterface.getForeignKeyReferencesForTable(tableName);
  return references.find((reference) => reference.columnName === columnName);
}

async function removeForeignKeyIfExists(queryInterface, tableName, columnName) {
  const foreignKey = await findForeignKey(queryInterface, tableName, columnName);
  if (!foreignKey) {
    return;
  }

  await queryInterface.removeConstraint(tableName, foreignKey.constraintName || foreignKey.constraint_name);
}

async function removeIndexIfExists(queryInterface, tableName, indexName) {
  const [indexes] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
  const exists = indexes.some((index) => index.Key_name === indexName);

  if (exists) {
    await queryInterface.removeIndex(tableName, indexName);
  }
}

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  const [indexes] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
  const exists = indexes.some((index) => index.Key_name === options.name);

  if (!exists) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

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

async function addForeignKeyIfMissing(queryInterface, tableName, columnName, options) {
  const foreignKey = await findForeignKey(queryInterface, tableName, columnName);
  if (!foreignKey) {
    await queryInterface.addConstraint(tableName, options);
  }
}

async function setUuidBinaryCollation(queryInterface, tableName, columnName) {
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` MODIFY \`${columnName}\` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL`
  );
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await columnExists(queryInterface, 'fish_observations', 'locationId')) {
      await removeForeignKeyIfExists(queryInterface, 'fish_observations', 'locationId');
      await removeIndexIfExists(queryInterface, 'fish_observations', 'fish_observations_location_id_observed_at');
      await removeIndexIfExists(queryInterface, 'fish_observations', 'fish_observations_location_id');
    }

    if (await tableExists(queryInterface, 'locations')) {
      await queryInterface.renameTable('locations', 'sorting_units');
    }

    if (await columnExists(queryInterface, 'fish_observations', 'locationId')) {
      await queryInterface.renameColumn('fish_observations', 'locationId', 'sortingUnitId');
    }

    await setUuidBinaryCollation(queryInterface, 'fish_observations', 'sortingUnitId');

    await addIndexIfMissing(queryInterface, 'fish_observations', ['sortingUnitId'], {
      name: 'fish_observations_sorting_unit_id'
    });
    await addIndexIfMissing(queryInterface, 'fish_observations', ['sortingUnitId', 'observedAt'], {
      name: 'fish_observations_sorting_unit_id_observed_at'
    });
    await addForeignKeyIfMissing(queryInterface, 'fish_observations', 'sortingUnitId', {
      fields: ['sortingUnitId'],
      type: 'foreign key',
      name: 'fish_observations_sorting_unit_id_fk',
      references: {
        table: 'sorting_units',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    if (await columnExists(queryInterface, 'fish_observations', 'sortingUnitId')) {
      await removeForeignKeyIfExists(queryInterface, 'fish_observations', 'sortingUnitId');
      await removeIndexIfExists(queryInterface, 'fish_observations', 'fish_observations_sorting_unit_id_observed_at');
      await removeIndexIfExists(queryInterface, 'fish_observations', 'fish_observations_sorting_unit_id');
    }

    if (await columnExists(queryInterface, 'fish_observations', 'sortingUnitId')) {
      await queryInterface.renameColumn('fish_observations', 'sortingUnitId', 'locationId');
    }

    if (await tableExists(queryInterface, 'sorting_units')) {
      await queryInterface.renameTable('sorting_units', 'locations');
    }

    await setUuidBinaryCollation(queryInterface, 'fish_observations', 'locationId');

    await addIndexIfMissing(queryInterface, 'fish_observations', ['locationId'], {
      name: 'fish_observations_location_id'
    });
    await addIndexIfMissing(queryInterface, 'fish_observations', ['locationId', 'observedAt'], {
      name: 'fish_observations_location_id_observed_at'
    });
    await addForeignKeyIfMissing(queryInterface, 'fish_observations', 'locationId', {
      fields: ['locationId'],
      type: 'foreign key',
      name: 'fish_observations_location_id_fk',
      references: {
        table: 'locations',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
};

'use strict';

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const legacyPath = path.join(__dirname, 'config.json');
// Keep existing local installations working. Containers use only DB_* settings.
const legacy = fs.existsSync(legacyPath) ? require(legacyPath) : {};

function databaseConfig(environment) {
  const config = Object.assign({
    username: 'root',
    password: null,
    database: 'aifishsortdb',
    host: '127.0.0.1',
    dialect: 'mysql',
    port: 3306,
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData'
  }, legacy[environment]);

  const overrides = {
    DB_HOST: 'host',
    DB_NAME: 'database',
    DB_USER: 'username',
    DB_PASSWORD: 'password'
  };
  for (const [variable, option] of Object.entries(overrides)) {
    if (process.env[variable] !== undefined) config[option] = process.env[variable];
  }
  if (process.env.DB_PORT !== undefined) {
    const port = Number(process.env.DB_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT must be an integer between 1 and 65535.');
    }
    config.port = port;
  }
  return config;
}

module.exports = {
  development: databaseConfig('development'),
  test: databaseConfig('test'),
  production: databaseConfig('production')
};

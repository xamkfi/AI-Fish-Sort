'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const source = fs.readFileSync(path.join(__dirname, '../config/config.js'), 'utf8');

function loadConfig(env) {
  const context = {
    __dirname: '/config',
    module: { exports: {} },
    process: { env },
    require(name) {
      if (name === 'dotenv') return { config() {} };
      throw new Error('Unexpected configuration dependency: ' + name);
    }
  };
  vm.runInNewContext(source, context);
  return context.module.exports;
}

test('DB settings come from environment variables without a JSON configuration file', () => {
  const config = loadConfig({
    DB_HOST: 'mysql', DB_PORT: '3307', DB_NAME: 'fish',
    DB_USER: 'fish-user', DB_PASSWORD: 'secret'
  }).production;
  assert.equal(config.host, 'mysql');
  assert.equal(config.port, 3307);
  assert.equal(config.database, 'fish');
  assert.equal(config.username, 'fish-user');
  assert.equal(config.password, 'secret');
  assert.equal(config.dialect, 'mysql');
});

test('defaults and environment overrides are consistent for local and container environments', () => {
  const defaults = loadConfig({});
  assert.equal(defaults.development.host, '127.0.0.1');
  assert.equal(defaults.production.database, 'aifishsortdb');
  assert.notEqual(defaults.development, defaults.production);
  const config = loadConfig({ DB_HOST: 'override', DB_PORT: '3308', DB_PASSWORD: '' }).development;
  assert.equal(config.host, 'override');
  assert.equal(config.port, 3308);
  assert.equal(config.password, '');
  assert.equal(defaults.development.host, '127.0.0.1');
});

test('the real model loader and migration CLI use config.js and environment settings', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    const db = require('./models');
    assert.equal(require('./.sequelizerc').config, path.resolve('config', 'config.js'));
    assert.equal(db.sequelize.config.host, 'config-test-host');
    assert.equal(db.sequelize.config.port, 3308);
    assert.equal(db.sequelize.config.database, 'config-test-db');
    assert.equal(db.sequelize.config.username, 'config-test-user');
    assert.equal(db.sequelize.config.password, 'config-test-password');
    db.sequelize.close().catch(() => process.exitCode = 1);
  `], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, NODE_ENV: 'production', DB_HOST: 'config-test-host', DB_PORT: '3308',
      DB_NAME: 'config-test-db', DB_USER: 'config-test-user', DB_PASSWORD: 'config-test-password'
    },
    encoding: 'utf8',
    timeout: 5000
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

test('invalid database ports fail with a clear configuration error', () => {
  for (const value of ['', 'abc', '0', '65536', '3306.5']) {
    assert.throws(() => loadConfig({ DB_PORT: value }), /DB_PORT/);
  }
});

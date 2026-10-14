'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../config/config.js'), 'utf8');

function loadConfig(env, legacy) {
  const context = {
    __dirname: '/config',
    module: { exports: {} },
    process: { env },
    require(name) {
      if (name === 'dotenv') return { config() {} };
      if (name === 'fs') return { existsSync: () => Boolean(legacy) };
      if (name === 'path') return path;
      return legacy;
    }
  };
  vm.runInNewContext(source, context);
  return context.module.exports;
}

test('container DB settings work without the legacy configuration file', () => {
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

test('local legacy values remain available and env overrides take precedence', () => {
  const legacy = { development: { host: 'local-db', port: 3308, password: 'legacy' } };
  assert.equal(loadConfig({}, legacy).development.host, 'local-db');
  const config = loadConfig({ DB_HOST: 'override', DB_PASSWORD: '' }, legacy).development;
  assert.equal(config.host, 'override');
  assert.equal(config.port, 3308);
  assert.equal(config.password, '');
  assert.equal(legacy.development.host, 'local-db');
});

test('invalid database ports fail with a clear configuration error', () => {
  for (const value of ['', 'abc', '0', '65536', '3306.5']) {
    assert.throws(() => loadConfig({ DB_PORT: value }), /DB_PORT/);
  }
});

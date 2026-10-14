'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../app');
const db = require('../models');

test('/health reports database readiness without creating sessions or leaking errors', async (t) => {
  const original = db.sequelize.authenticate;
  const server = http.createServer(app);
  t.after(async () => {
    db.sequelize.authenticate = original;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    app.sessionStore.stopExpiringSessions();
    await db.sequelize.close();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/health`;

  db.sequelize.authenticate = async () => {};
  let response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok' });

  db.sequelize.authenticate = async () => { throw new Error('private database credentials'); };
  response = await fetch(url);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

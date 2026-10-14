'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createHmac } = require('node:crypto');
const requireBearerToken = require('../middleware/requireBearerToken');

const token = 'test-bearer-credential-with-at-least-sixty-four-characters-0123456789';

function check(headers = {}, rawHeaders = [], session) {
  const responseHeaders = {};
  let error;
  let passed = false;
  requireBearerToken({ get: (name) => headers[name], rawHeaders, session }, {
    set: (name, value) => { responseHeaders[name] = value; }
  }, (value) => { error = value; passed = !value; });
  return { passed, error, responseHeaders };
}

test('Bearer credentials are required; obsolete headers, query tokens and sessions grant no access', (t) => {
  const original = process.env.SORTER_API_BEARER_TOKEN;
  process.env.SORTER_API_BEARER_TOKEN = token;
  t.after(() => {
    if (original === undefined) delete process.env.SORTER_API_BEARER_TOKEN;
    else process.env.SORTER_API_BEARER_TOKEN = original;
  });
  for (const headers of [
    {}, { 'X-API-Key': 'salainen' }, { access_token: token },
    { Authorization: 'Basic ' + token }, { Authorization: 'Bearer' },
    { Authorization: 'Bearer ' + token + ', Bearer ' + token },
    { Authorization: 'Bearer token with spaces' }
  ]) {
    const result = check(headers, [], { isAuthenticated: true });
    assert.equal(result.passed, false);
    assert.equal(result.error.status, 401);
    assert.match(result.responseHeaders['WWW-Authenticate'], /^Bearer /);
  }
  const duplicate = check({ Authorization: 'Bearer ' + token },
    ['Authorization', 'Bearer ' + token, 'authorization', 'Bearer ' + token]);
  assert.equal(duplicate.error.status, 401);
  assert.equal(check({ Authorization: 'Bearer ' + token }).passed, true);
  assert.equal(check({ Authorization: 'bearer   ' + token }).passed, true);
  for (const value of [token + 'extra', token.slice(0, -1), 'x', token.toUpperCase()]) {
    const result = check({ Authorization: 'Bearer ' + value });
    assert.equal(result.error.status, 401);
    assert.equal(result.error.code, 'BEARER_TOKEN_INVALID');
    assert.match(result.responseHeaders['WWW-Authenticate'], /invalid_token/);
    assert.equal(result.error.message.includes(token), false);
  }
});

test('unset and blank server credentials fail closed', (t) => {
  const original = process.env.SORTER_API_BEARER_TOKEN;
  t.after(() => {
    if (original === undefined) delete process.env.SORTER_API_BEARER_TOKEN;
    else process.env.SORTER_API_BEARER_TOKEN = original;
  });
  for (const value of [undefined, '', '  ']) {
    if (value === undefined) delete process.env.SORTER_API_BEARER_TOKEN;
    else process.env.SORTER_API_BEARER_TOKEN = value;
    const result = check({ Authorization: 'Bearer ' + token });
    assert.equal(result.passed, false);
    assert.equal(result.error.status, 503);
  }
});

test('all machine data routes require Bearer and valid read/write requests reach their controllers', async (t) => {
  const originalToken = process.env.SORTER_API_BEARER_TOKEN;
  process.env.SORTER_API_BEARER_TOKEN = token;
  const app = require('../app');
  const db = require('../models');
  const originals = {
    speciesList: db.Species.findAll,
    speciesFind: db.Species.findByPk,
    observationCreate: db.FishObservation.create,
    observationFind: db.FishObservation.findByPk
  };
  const storeOriginals = {
    get: app.sessionStore.get,
    set: app.sessionStore.set,
    touch: app.sessionStore.touch
  };
  const server = http.createServer(app);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    app.sessionStore.stopExpiringSessions();
    await db.sequelize.close();
    db.Species.findAll = originals.speciesList;
    db.Species.findByPk = originals.speciesFind;
    db.FishObservation.create = originals.observationCreate;
    db.FishObservation.findByPk = originals.observationFind;
    Object.assign(app.sessionStore, storeOriginals);
    if (originalToken === undefined) delete process.env.SORTER_API_BEARER_TOKEN;
    else process.env.SORTER_API_BEARER_TOKEN = originalToken;
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const paths = [
    '/species', '/sorting-units', '/locations', '/catch-locations', '/fish-batches',
    '/fish-observations', '/fish-observations/one', '/fish-stats/count', '/fish-stats/summary',
    '/fish-stats/timeline', '/fish-stats/distribution', '/fish-stats/comparison'
  ];
  for (const path of paths) {
    const response = await fetch(base + path);
    assert.equal(response.status, 401, path);
    assert.equal((await response.json()).error.code, 'BEARER_TOKEN_REQUIRED');
  }
  assert.equal((await fetch(base + '/fish-observations', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'salainen' }, body: '{}'
  })).status, 401);
  assert.equal((await fetch(base + '/species?access_token=' + token)).status, 401);
  assert.equal((await fetch(base + '/species', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await fetch(base + '/info')).status, 200);
  let reads = 0;
  db.Species.findAll = async () => { reads++; return [{ id: 'test-species', finnishName: 'Hauki' }]; };
  const headers = { Authorization: 'Bearer ' + token };
  const read = await fetch(base + '/species', { headers });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).data[0].id, 'test-species');
  assert.equal(reads, 1);
  assert.equal(read.headers.get('cache-control'), 'no-store');

  let creates = 0;
  db.Species.findByPk = async () => ({ id: 'test-species' });
  db.FishObservation.create = async (values) => { creates++; return { id: 'test-observation', ...values }; };
  db.FishObservation.findByPk = async () => ({ id: 'test-observation' });
  const write = await fetch(base + '/fish-observations', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ speciesId: 'test-species', observedAt: '2026-10-14T10:00:00Z' })
  });
  assert.equal(write.status, 201);
  assert.equal((await write.json()).data.id, 'test-observation');
  assert.equal(creates, 1);

  // Exercise the real session middleware with a signed test cookie and a fake store.
  const sessionId = 'bearer-auth-test-session';
  app.sessionStore.get = (id, callback) => callback(null, id === sessionId ? {
    cookie: { originalMaxAge: 3600000, expires: new Date(Date.now() + 3600000), httpOnly: true },
    isAuthenticated: true,
    adminId: 'test-admin'
  } : null);
  app.sessionStore.set = (id, session, callback) => callback();
  app.sessionStore.touch = (id, session, callback) => callback();
  const signature = createHmac('sha256', process.env.SESSION_SECRET || 'fish-ai-dev-secret')
    .update(sessionId).digest('base64').replace(/=+$/, '');
  const browserHeaders = { Cookie: 'connect.sid=' + encodeURIComponent(`s:${sessionId}.${signature}`) };
  const browserBase = base.replace('/api/v1', '');
  const dashboard = await fetch(browserBase + '/', { redirect: 'manual' });
  assert.equal(dashboard.status, 200);
  assert.equal((await dashboard.text()).includes(token), false);
  const dashboardData = await fetch(browserBase + '/api/dashboard/species');
  assert.equal(dashboardData.status, 200);
  const publicData = await dashboardData.text();
  assert.match(publicData, /test-species/);
  assert.equal(publicData.includes(token), false);
  assert.equal((await fetch(browserBase + '/api/dashboard/species', { headers: { Authorization: 'Bearer wrong' } })).status, 200);
  assert.equal((await fetch(browserBase + '/api/dashboard/species', { headers: browserHeaders })).status, 200);
  assert.equal((await fetch(base + '/species', { headers: browserHeaders })).status, 401);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal((await fetch(browserBase + '/api/dashboard/fish-observations', {
      method, headers: { 'Content-Type': 'application/json' }, body: '{}'
    })).status, 405);
  }
  assert.equal((await fetch(browserBase + '/api/dashboard/fish-observations/one')).status, 404);
  assert.equal(creates, 1);
  delete process.env.SORTER_API_BEARER_TOKEN;
  assert.equal((await fetch(browserBase + '/api/dashboard/species')).status, 503);
  process.env.SORTER_API_BEARER_TOKEN = token;
  const portal = await fetch(base, { headers: { Accept: 'text/html' } });
  const portalHtml = await portal.text();
  assert.equal(portal.status, 200);
  assert.match(portalHtml, /builderBearerToken/);
  assert.equal(portalHtml.includes(token), false);
});

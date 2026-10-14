'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { readSettings } = require('../middleware/trafficProtection');

test('rate limit settings validate limits and require explicit trusted proxies', () => {
  const defaults = readSettings({});
  assert.equal(defaults.webMax, 300);
  assert.equal(defaults.apiMax, 120);
  assert.equal(defaults.writeMax, 60);
  assert.equal(defaults.authMax, 10);
  assert.equal(defaults.trustProxy, false);
  assert.deepEqual(readSettings({ TRUST_PROXY: '127.0.0.1, 2001:db8::/64' }).trustProxy,
    ['127.0.0.1', '2001:db8::/64']);
  for (const value of ['', '0', '-1', '1.5', 'abc', 'Infinity']) {
    assert.throws(() => readSettings({ RATE_LIMIT_API_MAX: value }), /RATE_LIMIT_API_MAX/);
  }
  assert.throws(() => readSettings({ RATE_LIMIT_WINDOW_MS: '2147483648' }), /RATE_LIMIT_WINDOW_MS/);
  for (const value of ['true', '1', '0.0.0.0/0', '::/0', 'loopback', '127.0.0.1/33']) {
    assert.throws(() => readSettings({ TRUST_PROXY: value }), /TRUST_PROXY/);
  }
});

async function startApp(t, overrides = {}) {
  const values = {
    RATE_LIMIT_WINDOW_MS: '60000', RATE_LIMIT_AUTH_WINDOW_MS: '900000',
    RATE_LIMIT_WEB_MAX: '3', RATE_LIMIT_API_MAX: '3',
    RATE_LIMIT_API_WRITE_MAX: '1', RATE_LIMIT_AUTH_MAX: '1',
    TRUST_PROXY: 'false', ...overrides
  };
  const originalEnv = {};
  for (const [key, value] of Object.entries(values)) {
    originalEnv[key] = process.env[key];
    process.env[key] = value;
  }
  delete require.cache[require.resolve('../app')];
  const app = require('../app');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    app.sessionStore.stopExpiringSessions();
    for (const key of Object.keys(values)) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { app, request: (url, options) => fetch(base + url, options) };
}

test('API quota includes 404s, returns structured 429 and leaves web quota separate', async (t) => {
  const { request } = await startApp(t);
  for (let i = 0; i < 3; i++) assert.equal((await request('/api/missing')).status, 404);
  const response = await request('/API/missing?changed=1');
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.match(response.headers.get('ratelimit'), /api/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await request('/')).status, 200);
});

test('website quota covers static assets, unknown pages and HEAD requests', async (t) => {
  const { request } = await startApp(t);
  assert.equal((await request('/')).status, 200);
  await request('/stylesheets/style.css');
  await request('/missing', { method: 'HEAD' });
  const response = await request('/?different=1');
  assert.equal(response.status, 429);
  assert.match(response.headers.get('content-type'), /text\/plain/);
  assert.match(await response.text(), /Liikaa pyyntöjä/);
});

test('API writes are stopped before body parsing, including unauthenticated attempts', async (t) => {
  const { request } = await startApp(t);
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' };
  assert.equal((await request('/api/v1/fish-observations', options)).status, 400);
  const response = await request('/api/v1/fish-observations', options);
  assert.equal(response.status, 429);
  assert.match(response.headers.get('ratelimit'), /api-write/);
  assert.equal((await response.json()).error.code, 'RATE_LIMIT_EXCEEDED');
  // Reads consume only the overall API quota.
  assert.equal((await request('/api/missing')).status, 404);
});

test('login and password changes have independent POST quotas before sessions and hashing', async (t) => {
  const { request } = await startApp(t, { RATE_LIMIT_WEB_MAX: '20' });
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' };
  assert.equal((await request('/login/', options)).status, 400);
  assert.equal((await request('/LOGIN', options)).status, 429);
  assert.equal((await request('/admin/change-password', options)).status, 400);
  assert.equal((await request('/admin/change-password/', options)).status, 429);
});

test('spoofed forwarding headers do not create a fresh client quota with direct access', async (t) => {
  const { request } = await startApp(t);
  for (let i = 0; i < 3; i++) {
    assert.equal((await request('/api/missing')).status, 404);
  }
  for (let i = 1; i <= 2; i++) {
    const response = await request('/api/missing', {
      headers: { 'X-Forwarded-For': `198.51.100.${i}`, Forwarded: `for=198.51.100.${i}` }
    });
    assert.equal(response.status, 429);
  }
});

test('trusted proxies separate IPv4 clients and group IPv6 addresses by subnet', async (t) => {
  const { request } = await startApp(t, { TRUST_PROXY: '127.0.0.1', RATE_LIMIT_API_MAX: '1' });
  const asClient = (ip) => request('/api/missing', { headers: { 'X-Forwarded-For': ip } });
  assert.equal((await asClient('198.51.100.1')).status, 404);
  assert.equal((await asClient('198.51.100.1')).status, 429);
  assert.equal((await asClient('198.51.100.2')).status, 404);
  assert.equal((await asClient('2001:db8:abcd:1200::1')).status, 404);
  assert.equal((await asClient('2001:db8:abcd:1200::2')).status, 429);
  assert.equal((await asClient('2001:db8:abcd:1300::1')).status, 404);
});

test('quota resets after its time window', async (t) => {
  const { request } = await startApp(t, { RATE_LIMIT_WINDOW_MS: '200', RATE_LIMIT_API_MAX: '1' });
  assert.equal((await request('/api/missing')).status, 404);
  assert.equal((await request('/api/missing')).status, 429);
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal((await request('/api/missing')).status, 404);
});

test('health remains available when website and API quotas are exhausted', async (t) => {
  const { request } = await startApp(t, { RATE_LIMIT_WEB_MAX: '1', RATE_LIMIT_API_MAX: '1' });
  const db = require('../models');
  const original = db.sequelize.authenticate;
  db.sequelize.authenticate = async () => {};
  t.after(() => { db.sequelize.authenticate = original; });
  await request('/');
  assert.equal((await request('/')).status, 429);
  await request('/api/missing');
  assert.equal((await request('/api/missing')).status, 429);
  for (let i = 0; i < 4; i++) {
    const response = await request('/health');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('ratelimit'), null);
  }
});

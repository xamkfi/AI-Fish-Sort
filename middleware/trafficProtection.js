'use strict';

const { isIP } = require('node:net');
const { rateLimit } = require('express-rate-limit');

function positiveInteger(env, name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (env[name] === undefined) return fallback;
  const value = Number(env[name]);
  if (!/^\d+$/.test(env[name]) || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return value;
}

function trustedProxies(value) {
  if (value === undefined || value === '' || value === 'false') return false;
  const addresses = value.split(',').map((address) => address.trim());
  for (const address of addresses) {
    const parts = address.split('/');
    const version = isIP(parts[0]);
    if (!version || parts.length > 2 || (parts.length === 2 &&
      (!/^\d+$/.test(parts[1]) || Number(parts[1]) < 1 || Number(parts[1]) > (version === 4 ? 32 : 128)))) {
      throw new Error('TRUST_PROXY must contain explicit proxy IP addresses or CIDR ranges.');
    }
  }
  return addresses;
}

function readSettings(env = process.env) {
  return {
    windowMs: positiveInteger(env, 'RATE_LIMIT_WINDOW_MS', 60_000, 2_147_483_647),
    authWindowMs: positiveInteger(env, 'RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60_000, 2_147_483_647),
    webMax: positiveInteger(env, 'RATE_LIMIT_WEB_MAX', 300),
    apiMax: positiveInteger(env, 'RATE_LIMIT_API_MAX', 120),
    writeMax: positiveInteger(env, 'RATE_LIMIT_API_WRITE_MAX', 60),
    authMax: positiveInteger(env, 'RATE_LIMIT_AUTH_MAX', 10),
    trustProxy: trustedProxies(env.TRUST_PROXY)
  };
}

function isApiRequest(req) {
  return /^\/api(?:\/|$)/i.test(req.originalUrl.split('?')[0]);
}

function blockedRequest(req, res) {
  res.set('Cache-Control', 'no-store');
  if (isApiRequest(req)) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please retry after the time specified in Retry-After.'
      }
    });
  }
  res.status(429).type('text').send('Liikaa pyyntöjä. Odota hetki ja yritä uudelleen.');
}

function createTrafficProtection(env = process.env) {
  const settings = readSettings(env);
  function limiter(identifier, limit, windowMs, skip = () => false) {
    return rateLimit({
      windowMs,
      limit,
      identifier,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      ipv6Subnet: 56,
      skip,
      handler: blockedRequest
    });
  }
  return {
    settings,
    web: limiter('web', settings.webMax, settings.windowMs, isApiRequest),
    api: limiter('api', settings.apiMax, settings.windowMs),
    apiWrite: limiter('api-write', settings.writeMax, settings.windowMs,
      (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method)),
    login: limiter('login', settings.authMax, settings.authWindowMs, (req) => req.method !== 'POST'),
    passwordChange: limiter('password-change', settings.authMax, settings.authWindowMs,
      (req) => req.method !== 'POST')
  };
}

module.exports = { createTrafficProtection, readSettings };

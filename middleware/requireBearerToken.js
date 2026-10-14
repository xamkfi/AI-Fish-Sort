'use strict';

const { createHash, timingSafeEqual } = require('node:crypto');
const { createApiError } = require('../controllers/api/helpers');

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

module.exports = function requireBearerToken(req, res, next) {
  const expectedToken = process.env.SORTER_API_BEARER_TOKEN;
  res.set('Cache-Control', 'no-store');

  if (!expectedToken || !expectedToken.trim()) {
    return next(createApiError(503, 'BEARER_TOKEN_NOT_CONFIGURED', 'Sorter API authentication is not configured.'));
  }

  const authorization = req.get('Authorization');
  const match = typeof authorization === 'string'
    ? /^Bearer +([A-Za-z0-9\-._~+/]+=*)$/i.exec(authorization)
    : null;
  const headerCount = (req.rawHeaders || []).filter((value, index) =>
    index % 2 === 0 && value.toLowerCase() === 'authorization').length;

  if (!match || headerCount > 1) {
    res.set('WWW-Authenticate', 'Bearer realm="sorter-api"');
    return next(createApiError(401, 'BEARER_TOKEN_REQUIRED', 'Authorization: Bearer <token> is required.'));
  }

  if (!timingSafeEqual(digest(match[1]), digest(expectedToken))) {
    res.set('WWW-Authenticate', 'Bearer realm="sorter-api", error="invalid_token"');
    return next(createApiError(401, 'BEARER_TOKEN_INVALID', 'Bearer token is invalid.'));
  }

  next();
};

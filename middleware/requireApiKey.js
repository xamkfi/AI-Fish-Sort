'use strict';

const { createApiError } = require('../controllers/api/helpers');

function requireApiKey(req, res, next) {
  const expectedKey = process.env.WRITE_API_KEY;

  if (!expectedKey) {
    return next(createApiError(500, 'API_KEY_NOT_CONFIGURED', 'Write API key is not configured.'));
  }

  const receivedKey = req.get('X-API-Key');

  if (!receivedKey) {
    return next(createApiError(401, 'API_KEY_REQUIRED', 'X-API-Key header is required.'));
  }

  if (receivedKey !== expectedKey) {
    return next(createApiError(403, 'API_KEY_INVALID', 'X-API-Key is invalid.'));
  }

  next();
}

module.exports = requireApiKey;

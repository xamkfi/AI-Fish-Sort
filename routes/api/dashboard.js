'use strict';

const express = require('express');
const { asyncHandler, createApiError } = require('../../controllers/api/helpers');
const requireBearerToken = require('../../middleware/requireBearerToken');
const router = express.Router();

// Public dashboard reads use the server credential. Never give it to the browser.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.set('Allow', 'GET, HEAD');
    return next(createApiError(405, 'METHOD_NOT_ALLOWED', 'Dashboard data is read-only.'));
  }
  // Validate only the server-side credential; keep the real browser request intact.
  requireBearerToken({
    get: () => 'Bearer ' + (process.env.SORTER_API_BEARER_TOKEN || ''),
    rawHeaders: []
  }, res, next);
});

// Expose exactly the reads used by the dashboard, with no machine write routes.
const stats = require('../../controllers/api/fishStatsController');
const reads = {
  '/species': require('../../controllers/api/speciesController').list,
  '/sorting-units': require('../../controllers/api/sortingUnitController').list,
  '/catch-locations': require('../../controllers/api/catchLocationController').list,
  '/fish-batches': require('../../controllers/api/fishBatchController').list,
  '/fish-observations': require('../../controllers/api/fishObservationController').list,
  '/fish-stats/count': stats.count,
  '/fish-stats/summary': stats.summary,
  '/fish-stats/timeline': stats.timeline,
  '/fish-stats/distribution': stats.distribution,
  '/fish-stats/comparison': stats.comparison
};
for (const [path, handler] of Object.entries(reads)) {
  router.get(path, asyncHandler(handler));
}

module.exports = router;

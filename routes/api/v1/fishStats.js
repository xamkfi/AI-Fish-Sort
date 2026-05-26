'use strict';

const express = require('express');
const fishStatsController = require('../../../controllers/api/fishStatsController');
const { asyncHandler } = require('../../../controllers/api/helpers');

const router = express.Router();

router.get('/count', asyncHandler(fishStatsController.count));
router.get('/summary', asyncHandler(fishStatsController.summary));
router.get('/timeline', asyncHandler(fishStatsController.timeline));
router.get('/distribution', asyncHandler(fishStatsController.distribution));
router.get('/comparison', asyncHandler(fishStatsController.comparison));

module.exports = router;

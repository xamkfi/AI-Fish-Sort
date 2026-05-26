'use strict';

const express = require('express');
const fishObservationController = require('../../../controllers/api/fishObservationController');
const { asyncHandler } = require('../../../controllers/api/helpers');
const requireApiKey = require('../../../middleware/requireApiKey');

const router = express.Router();

router.get('/', asyncHandler(fishObservationController.list));
router.post('/', requireApiKey, asyncHandler(fishObservationController.create));
router.get('/:id', asyncHandler(fishObservationController.getById));

module.exports = router;

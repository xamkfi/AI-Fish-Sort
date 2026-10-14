'use strict';

const express = require('express');
const fishObservationController = require('../../../controllers/api/fishObservationController');
const { asyncHandler } = require('../../../controllers/api/helpers');

const router = express.Router();

router.get('/', asyncHandler(fishObservationController.list));
router.post('/', asyncHandler(fishObservationController.create));
router.get('/:id', asyncHandler(fishObservationController.getById));

module.exports = router;

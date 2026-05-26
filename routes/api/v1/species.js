'use strict';

const express = require('express');
const speciesController = require('../../../controllers/api/speciesController');
const { asyncHandler } = require('../../../controllers/api/helpers');

const router = express.Router();

router.get('/', asyncHandler(speciesController.list));

module.exports = router;

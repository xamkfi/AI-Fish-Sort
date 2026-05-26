'use strict';

const express = require('express');
const fishBatchController = require('../../../controllers/api/fishBatchController');
const { asyncHandler } = require('../../../controllers/api/helpers');

const router = express.Router();

router.get('/', asyncHandler(fishBatchController.list));

module.exports = router;

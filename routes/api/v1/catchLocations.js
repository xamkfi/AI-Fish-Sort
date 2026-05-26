'use strict';

const express = require('express');
const catchLocationController = require('../../../controllers/api/catchLocationController');
const { asyncHandler } = require('../../../controllers/api/helpers');

const router = express.Router();

router.get('/', asyncHandler(catchLocationController.list));

module.exports = router;

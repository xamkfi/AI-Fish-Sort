'use strict';

const express = require('express');
const sortingUnitController = require('../../../controllers/api/sortingUnitController');
const { asyncHandler } = require('../../../controllers/api/helpers');

const router = express.Router();

router.get('/', asyncHandler(sortingUnitController.list));

module.exports = router;

'use strict';

const express = require('express');
const catchLocationsRouter = require('./catchLocations');
const fishBatchesRouter = require('./fishBatches');
const fishObservationsRouter = require('./fishObservations');
const fishStatsRouter = require('./fishStats');
const sortingUnitsRouter = require('./sortingUnits');
const speciesRouter = require('./species');
const portalController = require('../../../controllers/api/portalController');
const requireBearerToken = require('../../../middleware/requireBearerToken');

const router = express.Router();

router.get('/', portalController.showIndex);
router.get('/info', portalController.info);

// Every machine data read and write requires the Bearer credential.
router.use(requireBearerToken);

router.use('/species', speciesRouter);
router.use('/sorting-units', sortingUnitsRouter);
router.use('/locations', sortingUnitsRouter);
router.use('/catch-locations', catchLocationsRouter);
router.use('/fish-batches', fishBatchesRouter);
router.use('/fish-observations', fishObservationsRouter);
router.use('/fish-stats', fishStatsRouter);

module.exports = router;

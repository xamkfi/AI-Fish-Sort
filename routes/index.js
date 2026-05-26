var express = require('express');
var router = express.Router();

function renderApiGuide(req, res, next) {
  res.render('apiGuide', {
    title: 'API-opas',
    baseUrl: req.protocol + '://' + req.get('host')
  });
}

/* GET home page (Dashboard). */
router.get('/', function(req, res, next) {
  res.render('dashboard', {
    title: 'AI Fish Sort - Dashboard',
    layout: false,
    isAuthenticated: Boolean(req.session && req.session.isAuthenticated)
  });
});

router.get('/apiGuide', function(req, res, next) {
  res.redirect(302, '/api/apiGuide');
});

router.get('/api/apiGuide', renderApiGuide);

module.exports = router;

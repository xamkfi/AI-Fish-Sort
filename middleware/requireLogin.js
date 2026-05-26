'use strict';

module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }

  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

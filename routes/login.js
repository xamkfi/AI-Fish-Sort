'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const csrf = require('csurf');
const { Admin } = require('../models');

const csrfProtection = csrf({ cookie: false });

router.get('/', csrfProtection, (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/admin');
  }

  res.render('login', {
    layout: false,
    title: 'Kirjaudu sisaan',
    csrfToken: req.csrfToken(),
    error: null
  });
});

router.post('/', csrfProtection, async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ where: { username } });

  if (admin && await bcrypt.compare(password || '', admin.passwordHash)) {
    req.session.isAuthenticated = true;
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    const returnTo = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    return req.session.save(() => res.redirect(returnTo));
  }

  res.render('login', {
    layout: false,
    title: 'Kirjaudu sisaan',
    csrfToken: req.csrfToken(),
    error: 'Virheellinen kayttajanimi tai salasana'
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;

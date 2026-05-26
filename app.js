require('dotenv').config({ quiet: true });

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var db = require('./models');
var hbs = require('hbs');

var SequelizeStore = require('connect-session-sequelize')(session.Store);
var sessionStore = new SequelizeStore({
  db: db.sequelize,
  tableName: 'Sessions'
});

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiV1Router = require('./routes/api/v1');
var loginRouter = require('./routes/login');
var adminRouter = require('./routes/admin');
var requireLogin = require('./middleware/requireLogin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

hbs.registerPartials(path.join(__dirname, 'views', 'partials'));
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fish-ai-dev-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 3600000
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.sessionStore = sessionStore;

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/v1', apiV1Router);
app.use('/login', loginRouter);
app.use('/admin', requireLogin, adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  if (req.path.indexOf('/api/') === 0) {
    return res.status(404).json({
      error: {
        message: 'API endpoint not found.',
        code: 'NOT_FOUND'
      }
    });
  }

  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if (req.path.indexOf('/api/') === 0) {
    return res.status(err.status || 500).json({
      error: {
        message: err.status ? err.message : 'Internal server error.',
        code: err.code || 'INTERNAL_ERROR'
      }
    });
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

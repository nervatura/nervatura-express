/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2021, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

module.exports = function () {

  var fs = require('fs');
  var express = require('express');

  var compression = require('compression');
  var passport = require('passport');
  var BearerStrategy = require('passport-http-bearer').Strategy;

  var cors = require('cors');
  var helmet = require('helmet');
  var hpp = require('hpp');
  var contentLength = require('express-content-length-validator');
  var express_enforces_ssl = require('express-enforces-ssl');

  var path = require('path');
  var logger = require('morgan');
  var bodyParser = require('body-parser');
  var methodOverride = require('method-override');

  require('dotenv').config()

  //routes
  var cli = require('./routes/cli');
  var rpc = require('./routes/rpc');

  var app = express();
  app.set('env', process.env.NODE_ENV || 'development');

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.engine('.html', require('ejs').__express);
  app.engine('.xml', require('ejs').__express);
  app.set('view engine', 'ejs');

  app.use(compression());
  
  if ((app.get('env') === 'production')) {
    app.enable('trust proxy');
    app.disable('x-powered-by');
    app.use(express_enforces_ssl());
  }
  app.use(logger((app.get('env') === 'development') ? 'dev' : 'common'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(methodOverride());

  app.use(cors());
  app.use('/cli', cli);
  app.use('/rpc', rpc);

  app.use(passport.initialize());
  passport.use(new BearerStrategy({ passReqToCallback: true }, require('./lib/api.js').BearerApi))
  app.use(hpp());
  app.use(helmet());
  app.use(contentLength.validateMax({ max: process.env.NT_CONTENT_LENGTH || 20000, status: 400, message: 'Too much content' }));

  app.get('/', function(req, res, next) {
    res.redirect('https://nervatura.github.io/nervatura-client/');
  });
  
  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    res.locals.user = req.user;
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  return app;
}
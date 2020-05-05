/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2019, Csaba Kappel
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
  var favicon = require('serve-favicon');
  var logger = require('morgan');
  var bodyParser = require('body-parser');
  var methodOverride = require('method-override');
  var _ = require('lodash');

  require('dotenv').config()

  //routes
  var api = require('./routes/api');
  var npi = require('./routes/npi');

  var app = express();
  app.locals._ = _;
  app.set('env', process.env.NODE_ENV || 'development');

  var version = require('./package.json').version;
  app.set('version', version + '-NJS/EXPRESS');
  app.set('version_number', version);

   //host ip,port
  app.set('host_type', process.env.NT_HOST_TYPE || 'localhost');
  if (process.env.OPENSHIFT_NODEJS_IP) {
    app.set('host_type', 'openshift');
    app.set('ip', process.env.OPENSHIFT_NODEJS_IP);
  }
  if (process.env.OPENSHIFT_NODEJS_PORT) {
    app.set('host_type', 'openshift');
    app.set('port', process.env.OPENSHIFT_NODEJS_PORT);
  }

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
  app.use('/api', api);
  app.use('/npi', npi);

  app.use(passport.initialize());
  passport.use(new BearerStrategy({ passReqToCallback: true }, require('./lib/api.js').BearerApi))
  app.use(hpp());
  app.use(helmet());
  app.use(contentLength.validateMax({ max: process.env.NT_CONTENT_LENGTH || 20000, status: 400, message: 'Too much content' }));

  app.use('/docs', express.static('node_modules/nervatura-docs/docs'));
  app.use('/report', express.static('node_modules/nervatura-demo/docs'));
  app.use('/client', express.static('node_modules/nervatura-client/build'));
  var _favicon = favicon(path.join("www", "favicon.ico"));
  if(process.env.NT_START_PAGE !== "default"){
    var www_path = path.join(__dirname, 'www')
    var node_module = false
    try {
      node_module = fs.statSync(path.join(__dirname, '..', '..', 'www')).isDirectory()
      if(node_module){
        www_path = path.join(__dirname, '..', '..', 'www')
      }
    } catch (error) { }
    try {
      var vhosts = require(path.join(www_path, 'vhost.json'));
      var vhost = require('vhost');
      var vapp;
      for (const dname in vhosts) {
        if ((dname === "*") || vhosts[dname].default) {
          vapp = app;
        }
        else {
          vapp = express();
          app.use(vhost(dname, vapp));
        }
        var domain = vhosts[dname].static || vhosts[dname].default;
        if (domain) {
          for (const dpath in domain) {
            vapp.use(dpath, express.static(path.join(www_path, domain[dpath])));
          }
        }
        if (vhosts[dname].route) {
          try {
            for (const dpath in vhosts[dname].route) {
              var vroute = require(path.join(www_path, vhosts[dname].route[dpath]));
              vapp.use(dpath, vroute);
            }
          } catch (error) { }
        }
        if (vhosts[dname].favicon) {
          _favicon = favicon(path.join(www_path, vhosts[dname].favicon));
        }
      }
    }
    catch (e) {
      app.use(express.static(www_path));
    }
  } else {
    app.get('/', function(req, res, next) {
      res.redirect('/docs/');
    });
  }
  app.use(_favicon);
  
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
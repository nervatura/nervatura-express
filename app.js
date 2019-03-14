/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2019, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

/* global __dirname */

module.exports = function(callback){
  
var fs = require('fs');
var express = require('express');
var session = require('cookie-session')

var compression = require('compression');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var cors = require('cors');
var lusca = require('lusca');
var helmet = require('helmet');
var hpp = require('hpp');
var contentLength = require('express-content-length-validator');
var express_enforces_ssl = require('express-enforces-ssl');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var _ = require('lodash');
  
//routes
var ntura = require('./routes/ntura');
var demo = require('./routes/demo');
var npi = require('./routes/npi');
var ndi = require('./routes/ndi');
var login = require('./routes/login');
var nas = require('./routes/nas');
var report = require('./routes/report');
var wizard = require('./routes/wizard');
var custom = require('./routes/custom');

var app_settings = require('./lib/settings.json');
try {
  app_settings = require('../../www/conf/settings.json'); } 
catch (error) {
  try {
    app_settings = require('./www/conf/settings.json');
  } catch (error) {}}
var databases  = require('./lib/databases.json');
try {
  databases = require('../../www/conf/databases.json'); } 
catch (error) {
  try {
    databases = require('./www/conf/databases.json');
  } catch (error) {}}

var app = express();
app.locals._ = _;
app.set('env', process.env.NODE_ENV || 'development');

var conf =require('nervatura').conf(app_settings);
app.set('conf', conf);

//host ip,port
app.set('host_type', conf.host_type);
if(process.env.OPENSHIFT_NODEJS_IP){
  app.set('host_type', 'openshift');
  app.set('ip', process.env.OPENSHIFT_NODEJS_IP);}
if(process.env.OPENSHIFT_NODEJS_PORT){
  app.set('host_type', 'openshift');
  app.set('port', process.env.OPENSHIFT_NODEJS_PORT);}

//data directory
if(process.env.OPENSHIFT_DATA_DIR){
  app.set('data_dir', process.env.OPENSHIFT_DATA_DIR);}
else if(process.env.NERVATURA_DATA_DIR){
  app.set('data_dir', process.env.NERVATURA_DATA_DIR);}
else{
  try {
    app.set('data_dir', conf.data_dir || 'data');
    fs.statSync(app.get('data_dir'));} 
  catch(e) {
    try {
      fs.statSync(path.join(__dirname, 'data'));} 
    catch(e) {
      fs.mkdirSync(path.join(__dirname, 'data'));}
    app.set('data_dir', path.join(__dirname, 'data'));}}
try {
  fs.statSync(path.join(app.get('data_dir'),'database'));} 
catch(e) {
  fs.mkdirSync(path.join(app.get('data_dir'),'database'));}
try {
  fs.statSync(path.join(app.get('data_dir'),'storage'));} 
catch(e) {
  fs.mkdirSync(path.join(app.get('data_dir'),'storage'));}
try {
  fs.statSync(path.join(app.get('data_dir'),'data'));} 
catch(e) {
  fs.mkdirSync(path.join(app.get('data_dir'),'data'));}
app.set('report_dir', conf.report_dir);

var version = require('./package.json').version;
app.set('version', version+'-NJS/EXPRESS');
app.set('version_number', version);

var util = require('nervatura').tools.DataOutput();
var lang = require('nervatura').lang[conf.lang];
app.locals.lang = lang;

require('./lib/ext/storage.js')({ data_store: conf.data_store,
  databases: databases[app.get("host_type")] || databases.default,
  conf: conf, lang: lang, data_dir:app.get('data_dir'), host_type:app.get("host_type"), 
  callback:function(err, storage, host_settings){
    if(!err){
      app.set('storage', storage);
      //check settings values
      for (var setting in conf.def_settings) {
        if(!host_settings[setting] || host_settings[setting]===""){
          host_settings[setting] = conf.def_settings[setting];
          storage.updateSetting(
            {fieldname:setting,value:host_settings[setting],description:""});}
        if(setting.indexOf("host_restriction")>-1){
          if(host_settings[setting]==="" || !host_settings[setting]){
            host_settings[setting] = [];}
          else{
            host_settings[setting] = host_settings[setting].split(",");}}}
      for (var setting in host_settings) {
        if(process.env[String(setting).toUpperCase()]){
          host_settings[setting] = process.env[String(setting).toUpperCase()];}}
      app.set('host_settings', host_settings);

      // view engine setup
      app.set('views', path.join(__dirname, 'views'));
      app.set('core-views', path.join(util.getValidPath(),"..","views"));
      app.engine('.html', require('ejs').__express);
      app.engine('.xml', require('ejs').__express);
      app.set('view engine', 'ejs');
        
      app.use(compression());
      //app.use(express.static(path.join(__dirname, 'public')));
      app.use('/download', express.static(path.join(util.getValidPath(),"..","public","download")));
      app.use('/images', express.static(path.join(util.getValidPath(),"..","public","images")));
      app.use('/report', express.static(path.join(util.getValidPath(),"..","public","report")));
      app.use('/js', express.static(path.join(__dirname, 'lib/dist/js')));
      app.use('/css', express.static(path.join(__dirname, 'lib/dist/css')));

      app.use('/lib/ntura', express.static(path.join(util.getValidPath(),"..","public","js")));
      app.use('/lib/w3', express.static(path.join(util.getValidPath(),"..","..","w3-css")));
      app.use('/lib/highlightjs', express.static(path.join(util.getValidPath(),"..","..","highlightjs")));
      app.use('/lib/report', express.static(path.join(util.getValidPath(),"..","..","nervatura-report","dist")));
      app.use('/lib/pdfjs', express.static(path.join(util.getValidPath(),"..","..","pdfjs-dist","build")));
      app.use('/lib/icon', express.static(path.join(util.getValidPath(),"..","..","font-awesome")));
      app.use('/lib/flatpickr', express.static(path.join(util.getValidPath(),"..","..","flatpickr","dist")));
      app.use('/lib/base64', express.static(path.join(util.getValidPath(),"..","..","base64-js")));
      
      if ((app.get('env') === 'production')) {
        app.enable('trust proxy');
        app.disable('x-powered-by');
        app.use(express_enforces_ssl());}
      app.use(logger((app.get('env')==='development')?'dev':'common'));
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({extended: true}));
      app.use(methodOverride());
      app.use(cookieParser(conf.session_secret));
      app.use(session({name:'ntura', 
        secret: conf.session_secret,
        httpOnly: true, maxAge: conf.session_cookie_max_age,
        secure: (app.get('env') === 'production') ? true : false,  
        proxy: (app.get('env') === 'production') ? true : false}))
      
      app.use(cors());
      app.use('/npi', npi);
      app.use('/ndi', ndi);

      app.use(passport.initialize());
      app.use(passport.session());
      app.use(hpp());
      app.use(helmet());
      app.use(contentLength.validateMax({max: conf.max_content_length, status: 400, message: 'Too much content'}));
      
      var _favicon = favicon(path.join(util.getValidPath(),"..","public","images","favicon.ico"));
      switch (conf.start_page) {
        case "static":
          var www_path = path.join(__dirname, 'www')
          if (fs.statSync(path.join(__dirname, '..', '..', 'www')).isDirectory()){
            www_path = path.join(__dirname, '..', '..', 'www') 
          }
          try {
            var vhosts = require(path.join(www_path, 'vhost.json'));
            var vhost = require('vhost');
            var vapp;
            for (const dname in vhosts) {
              if((dname === "*") || vhosts[dname].default){
                vapp = app; }
              else {
                vapp = express();
                app.use(vhost(dname, vapp)); }
              var domain = vhosts[dname].static || vhosts[dname].default;
              if(domain){
                for (const dpath in domain) {
                  vapp.use(dpath, express.static(path.join(www_path, domain[dpath]))); }}
              if(vhosts[dname].route){
                try {
                  for (const dpath in vhosts[dname].route) {
                    var vroute = require(path.join(www_path, vhosts[dname].route[dpath]));
                    vapp.use(dpath, vroute); }
                } catch (error) {}}
              if(vhosts[dname].favicon){
                _favicon = favicon(path.join(www_path, vhosts[dname].favicon)); }}} 
          catch(e) {
            app.use(express.static(www_path)); }
          break;
        case "custom":
          app.use('/', custom);
          break;
        default:
          app.use('/', ntura);
          break;}
      
      app.use(_favicon);
      app.use('/login', login);
      app.use('/ntura', ntura);

      app.use(lusca.csrf({secret: conf.session_secret}));
      app.use('/nas', nas);
      app.use('/report', report);
      app.use('/ndi/wizard', wizard);
      app.use('/ndi/demo', demo);
      
      // Configure the local strategy for use by Passport.
      passport.use(new LocalStrategy(
        conf.nas_login.local, storage.getUserFromName));
      if(util.checkOptional('passport-azure-ad') && conf.nas_login.azure.clientID && conf.nas_login.azure.clientSecret 
        && conf.nas_login.azure.redirectUrl && conf.nas_login.azure.identityMetadata){
        var AzureStrategy = require('passport-azure-ad').OIDCStrategy;
        passport.use(new AzureStrategy( conf.nas_login.azure,
          function(iss, sub, profile, accessToken, refreshToken, cb) {
            if (!profile._json.email) {
              return cb(lang.no_email_found, null);}
            else {
              process.nextTick(function () {
                storage.getUserFromEmail(profile._json.email, profile, accessToken, 
                  function (err, user, info) {
                    return cb(err, user, info); });});}}));}
      if(util.checkOptional('passport-google-oauth20') && conf.nas_login.google.clientID && conf.nas_login.google.clientSecret){
        var GoogleStrategy = require('passport-google-oauth20').Strategy;
        passport.use(new GoogleStrategy( conf.nas_login.google,
          function(accessToken, refreshToken, profile, cb) {
            if(profile.emails.length === 0){
              return cb(lang.no_email_found, null);}
            else {
              process.nextTick(function () {
                storage.getUserFromEmail(profile.emails[0].value, profile, accessToken, 
                  function (err, user, info) {
                    return cb(err, user, info); });});}}));}
      if(util.checkOptional('passport-amazon') && conf.nas_login.amazon.clientID && conf.nas_login.amazon.clientSecret){
        var AmazonStrategy = require('passport-amazon').Strategy;
        passport.use(new AmazonStrategy( conf.nas_login.amazon,
          function(accessToken, refreshToken, profile, cb) {
            if(profile.emails.length === 0){
              return cb(lang.no_email_found, null);}
            else {
              process.nextTick(function () {
                storage.getUserFromEmail(profile.emails[0].value, profile, accessToken, 
                  function (err, user, info) {
                    return cb(err, user, info); });});}}));}
      passport.serializeUser(function(user, cb) {cb(null, user.id);});
      passport.deserializeUser(storage.getUserFromId);
      
      // catch 404 and forward to error handler
      app.use(function(req, res, next) {
        res.locals.user = req.user;
        var err = new Error('Not Found');
        err.status = 404;
        next(err);});

      // error handlers

      // development error handler
      // will print stacktrace
      if (app.get('env') === 'development') {
        app.use(function(err, req, res, next) {
          res.status(err.status || 500);
          res.render('error', {
            message: err.message,
            error: err});});}

      // production error handler
      // no stacktraces leaked to user
      app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
          message: err.message,
          error: {}});});
    
    return callback(err, app);}
    else{
      return callback(err, app);}}});}
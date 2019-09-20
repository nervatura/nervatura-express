/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2019, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var express = require('express');
var router = express.Router();
var passport = require('passport');
var npi = require('nervatura').npi;

router.use(function (req, res, next) {
  next()
});

router.all('/getVernum', function (req, res, next) {
  res.send(req.app.settings.version);
});

router.post('/token/login', function (req, res, next) {
  login(req, res)
});

router.post('/token', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var sendResult = require('../lib/result.js').sendResult;
  npi().getApi(req.user, req.body, function (result) {
    sendResult(res, result);
  });
});

router.post('/', function (req, res, next) {
  login(req, res)
});

function login(req, res) {
  var sendResult = require('../lib/result.js').sendResult;
  var params = req.body.params; params.api_login = true
  npi().getLogin({}, params, function (result) {
    sendResult(res, { type: "json", id: 1, data: result });
  });
};
 
module.exports = router;

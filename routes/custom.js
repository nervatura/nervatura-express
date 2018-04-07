/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2018, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var express = require('express');
var router = express.Router();

router.use(function (req, res, next) {
  next()
});

router.get('/', function(req, res, next) {
  res.redirect('/index');
});

router.get('/index', function(req, res, next) {
  res.render('custom/index.html',{});
});

module.exports = router;
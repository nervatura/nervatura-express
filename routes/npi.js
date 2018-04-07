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

router.all('/getVernum', function(req, res, next) {
  res.send(req.app.settings.version);});

router.post('/call/jsonrpc', function (req, res, next) {
  index(req.body, req, res);});

router.post('/call/jsonrpc2', function (req, res, next) {
  index(req.body, req, res);});
  
router.post('/jsonrpc', function (req, res, next) {
  index(req.body, req, res);});

router.post('/jsonrpc2', function (req, res, next) {
  index(req.body, req, res);});
  
router.post('/', function (req, res, next) {
  index(req.body, req, res);});

function index(params, req, res) {
  var sendResult = require('../lib/ext/result.js').sendResult;
  if (req.app.get("host_settings").npi_host_restriction.length>0 && req.app.get("host_settings").npi_host_restriction.indexOf(req.ip)===-1){
    sendResult(res, {type:"error", id:"host_restrict", ekey:"message", err_msg: "NPI "+req.app.locals.lang.insecure_err}); }
  else if (req.app.get("host_settings").npi_host_restriction.length===0 && req.app.get("host_settings").all_host_restriction.length>0 
    && req.app.get("host_settings").all_host_restriction.indexOf(req.ip)===-1){
      sendResult(res, {type:"error", id:"host_restrict", ekey:"message", err_msg: "NPI "+req.app.locals.lang.insecure_err}); }
  else {
    var nstore = require('nervatura').nervastore({ 
      conf: req.app.get("conf"), data_dir: req.app.get("data_dir"), report_dir: req.app.get("report_dir"),
      host_ip: req.ip, host_settings: req.app.get("host_settings"), storage: req.app.get("storage"),
      lang: req.app.locals.lang });
    var Npi = require('nervatura').npi;
    Npi(req.app.locals.lang).getApi(nstore, params, function(result){
      sendResult(res, result); });}};
 
module.exports = router;

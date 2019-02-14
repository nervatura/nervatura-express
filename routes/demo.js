/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2019, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var express = require('express');
var router = express.Router();

var async = require("async");
var path = require('path');

router.use(function (req, res, next) {
  next()
});

router.get('/create', function(req, res, next) {
  var params = {database:req.query.database, 
    username:req.query.username, password:req.query.password}
  create_demo(params, req, res, function(results){
    res.render(path.join(req.app.get("core-views"),'template','demo.html'),{data:results});});});

router.post('/create', function(req, res, next) {
  req.setTimeout(req.app.settings.conf.long_timeout);
  var params = {database:req.body.database, 
    username:req.body.username, password:req.body.password}
  create_demo(params, req, res, function(results){
    res.set('Content-Type', 'text/json');
    res.send({"id":null, "jsonrpc": "2.0", "result":results});});});

function create_demo(params, req, res, callback){
  var nstore = require('nervatura').nervastore({ 
    conf: req.app.get("conf"), data_dir: req.app.get("data_dir"), report_dir: req.app.get("report_dir"),
    host_ip: req.ip, host_settings: req.app.get("host_settings"), storage: req.app.get("storage"),
    lang: req.app.locals.lang });
  var nas = require('nervatura').nas();
  nas.createDemo(nstore, params, function(results){
    callback(results); });
}

module.exports = router;
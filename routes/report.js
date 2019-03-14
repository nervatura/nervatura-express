/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2019, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

/* global Buffer */

var express = require('express');
var router = express.Router();
var util = require('nervatura').tools.DataOutput();
var Report = require('nervatura-report/dist/report.node')
var fs = require('fs');
var path = require('path');

router.use(function (req, res, next) {
  next()});

router.get('/', function(req, res, next) {
  res.redirect('/report/index');});

router.get('/index', function(req, res, next) {
  res.render('report/index.html',{view:"index"});});

router.get('/server', function(req, res, next) {
  res.render('report/index.html',{flash:"", view:"server"});});

router.all('/document', function(req, res, next) {
  var orient = "portrait"; var format = "pdf";
  if (req.query.data || req.body.data){
    format = "xml";}
  if (req.query.landscape || req.body.landscape){
    orient = "landscape";}
  
  var rpt = new Report(orient);
  if (req.query.json || req.body.json){
    var json_template = fs.readFileSync(path.join(util.getValidPath(),"..","report","sample.json"), "utf8").toString()
    rpt.loadJsonDefinition(json_template);
  } else {
    var xml_template = fs.readFileSync(path.join(util.getValidPath(),"..","report","sample.xml"), "utf8").toString()
    rpt.loadDefinition(xml_template);
  }
  rpt.createReport();
  if(format === "xml"){
    res.set('Content-Type', 'text/xml');
    res.end(rpt.save2Xml());
  } else {
    rpt.save2Pdf((pdf) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.end(new Buffer(pdf));
    })}
  });

router.get('/template', function(req, res, next) {
  if (req.query.json){
    res.download(path.join(util.getValidPath(),"..","report","sample.json"), 'sample.json', function(err){
      if(err){return next(err);}});
  } else {
    res.download(path.join(util.getValidPath(),"..","report","sample.xml"), 'sample.xml', function(err){
      if(err){return next(err);}});}});

router.get('/client', function(req, res, next) {
  res.render('report/index.html',{view:"client"});});

module.exports = router;
/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2019, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var async = require("async");
var moment = require('moment');
var https = require('https');

var api = require('nervatura').api;

function getJwkKids(app, callback) {
  let certs_stamp = (app.get("certs_stamp")) ? moment.utc(app.get("certs_stamp"), 'YYYY-MM-DD').format('YYYY-MM-DD') : ""
  let cur_stamp = moment.utc().format('YYYY-MM-DD')
  if((!app.get("kids") || (certs_stamp !== cur_stamp)) && process.env.NT_JWK_X509 ){
    https.get(process.env.NT_JWK_X509, function(res) {

      if (res.statusCode !== 200) {
        res.resume();
        callback(res.statusCode); }

      res.setEncoding('utf8');
      var rawData = '';
      res.on('data', function(chunk) { 
        rawData += chunk; });
      res.on('end', function() {
        try {
          var parsedData = JSON.parse(rawData);
          if(process.env.NT_TOKEN_KID){
            parsedData[process.env.NT_TOKEN_KID] = process.env.NT_TOKEN_KEY
          }
          app.set("kids", parsedData);
          app.set("certs_stamp", cur_stamp); 
          callback(null, parsedData);} 
        catch (err) {
          callback(err.message); }}
        );
    }).on('error', function(err) {
      callback(err.message); });
  }
  else {
    if (!app.get("kids")){
      app.set("kids", { [process.env.NT_TOKEN_KID]: process.env.NT_TOKEN_KEY});
    }
    callback(null, app.get("kids"));
  }
}

exports.BearerApi = function (req, token, cb) {
  var params = { token: token }
  async.waterfall([
    function (callback) {
      var dtoken = api().AuthDecode(token)
      getJwkKids(req.app, function(err, certs){
        params.key = certs[dtoken.header.kid],
        params.options = { algorithms: [dtoken.header.alg] }
        callback(err)
      })
    },

    function (callback) {
      api().AuthTokenLogin(params, function (err, nstore) {
        callback(err, nstore)
      })
    }
  ],
    function (err, nstore) {
      if (err || !nstore) {
        return cb(null, false);
      }
      else {
        return cb(null, nstore, { scope: nstore.employee().groupvalue });
      }
    }
  );
}
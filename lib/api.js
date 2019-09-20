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

function getGoogleCerts(app, callback) {
  let certs_stamp = (app.get("certs_stamp")) ? moment.utc(app.get("certs_stamp"), 'YYYY-MM-DD').format('YYYY-MM-DD') : ""
  let cur_stamp = moment.utc().format('YYYY-MM-DD')
  if(!app.get("google_certs") || (certs_stamp !== cur_stamp) ){
    https.get(process.env.NT_CERT_GOOGLE, function(res) {

      if (res.statusCode !== 200) {
        res.resume();
        callback(res.statusCode); }

      res.setEncoding('utf8');
      var rawData = '';
      res.on('data', function(chunk) { 
        rawData += chunk; });
      res.on('end', function() {
        try {
          const parsedData = JSON.parse(rawData);
          app.set("google_certs", parsedData);
          app.set("certs_stamp", cur_stamp); 
          callback(null, parsedData);} 
        catch (err) {
          callback(err.message); }}
        );
    }).on('error', function(err) {
      callback(err.message); });
  }
  else {
    callback(null, app.get("google_certs"));
  }
}

exports.BearerApi = function (req, token, cb) {
  var params = { token: token }
  async.waterfall([
    function (callback) {
      var dtoken = api().AuthDecode(token)
      var iss = process.env.NT_TOKEN_ISS || "nervatura"
      if (dtoken.payload.iss !== iss) {
        if(dtoken.payload.iss.includes("securetoken.google.com")){
          getGoogleCerts(req.app, function(err, certs){
            params.key = certs[dtoken.header.kid],
            params.options = { algorithms: [dtoken.header.alg] }
            callback(err)
          })
        } else {
          callback("err")
        }
      } else {
        callback(null)
      }
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
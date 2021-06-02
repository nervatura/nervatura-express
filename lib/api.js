/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2021, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var cli = require('./cli');
var rpc = require('./rpc');

exports.BearerApi = function (req, token, cb) {
  if(req.baseUrl == "/cli"){
    cli.TokenLogin(token, function (err, user) {
      if (err || !user) {
        return cb(null, false);
      }
      else {
        return cb(null, user, { scope: user.scope, token: token });
      }
    })
  } else if(req.baseUrl == "/rpc"){
    rpc.TokenLogin(token, function (err, user) {
      if (err || !user) {
        return cb(null, false);
      }
      else {
        return cb(null, user, { scope: user.scope, token: token });
      }
    })
  } else {
    return cb(null, false);
  }
}
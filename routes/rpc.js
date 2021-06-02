/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2021, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var express = require('express');
var router = express.Router();
var passport = require('passport');

var rpc = require('../lib/rpc');
var Models = require('../lib/result').Models;

router.use(function (req, res, next) {
  next()
});

router.post('/auth/login', function (req, res, next) {
  rpc.UserLogin(req.body, function(err, data){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      sendResult(res, 200, data);
    }
  })
});

router.post('/auth/password', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var params = req.body
  if((params.username || params.custnumber) && (req.authInfo.scope !== "admin")){
    sendResult(res, 401);
  } else {
    rpc.UserPassword(req.authInfo.token, params, function(err, data){
      if(err){
        sendResult(res, 400, {code:400, message: err})
      } else {
        sendResult(res, 204);
      }
    })
  }
});

router.get('/auth/refresh', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  rpc.TokenRefresh(req.authInfo.token, function(err, data){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      sendResult(res, 200, data);
    }
  })
})

router.all('/report', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var params = (req.method === "GET") ? req.query : req.body
  rpc.Report(req.authInfo.token, params, function(err, bdata){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      //var buffer = Buffer.from([bdata])
      var jdata = bdata.toString('utf-8')
      var data = JSON.parse(jdata)
      var result
      if(params.output === "tmp"){
        res.set('Content-Type', 'application/json');
        result = data
      } else {
        if(data.filetype === "csv"){
          res.setHeader('Content-Disposition', 'attachment; filename=Report.csv');
          res.set('Content-Type', 'text/csv');
          result = Buffer.from(data.template, 'base64')
        } else {
          if(data.filetype === "ntr" && params.output === "xml"){
            res.setHeader('Content-Disposition', 'attachment; filename=Report.xml');
            res.set('Content-Type', 'application/xml');
            result = data.template
          } else {
            res.setHeader('Content-Disposition', 'attachment; filename=Report.pdf');
            res.set('Content-Type', 'application/pdf');
            if(data.filetype === "base64"){
              data.template = Buffer.from(data.template.substring(data.template.indexOf(";base64,")+8), 'base64')
            }
            result = data.template
          }
        }
      }
      res.status(200).send(result)
    }
  })
});

router.get('/report/list', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var params = { label: req.query.label }
  if(req.authInfo.scope === "admin"){
    rpc.ReportList(req.authInfo.token, params, function(err, data){
      if(err){
        sendResult(res, 400, {code:400, message: err})
      } else {
        sendResult(res, 200, data);
      }
    })
  } else {
    sendResult(res, 401);
  }
});

router.post('/report/install', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  if(req.authInfo.scope === "admin"){
    rpc.ReportInstall(req.authInfo.token, req.query, function(err, id){
      if(err){
        sendResult(res, 400, {code:400, message: err})
      } else {
        sendResult(res, 200, [id]);
      }
    })
  } else {
    sendResult(res, 401);
  }
});

router.delete('/report/delete', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  if(req.authInfo.scope === "admin"){
    rpc.ReportDelete(req.authInfo.token, req.query, function(err, data){
      if(err){
        sendResult(res, 400, {code:400, message: err})
      } else {
        sendResult(res, 204);
      }
    })
  } else {
    sendResult(res, 401);
  }
});


router.post('/database', function (req, res, next) {
  var params = { alias: req.query.alias, demo: (req.query.demo === "true") ? true : false }
  rpc.DatabaseCreate(req.headers["x-api-key"], params, function(err, results){
    if(err){
      sendResult(res, 400, {code:400, message: err, data: results})
    } else {
      sendResult(res, 200, results);
    }
  })
});

router.post('/function', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  rpc.Function(req.authInfo.token, req.body, function(err, results){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      sendResult(res, 200, results);
    }
  })
});

router.post('/view', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  rpc.View(req.authInfo.token, req.body, function(err, results){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      sendResult(res, 200, results);
    }
  })
});

router.get('/*', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var datatype = req.path.split("/")[1]
  if(datatype) {
    if (Models.includes(datatype)){
      var params = {
        datatype: datatype,
        metadata: (req.query.metadata === "true") ? true : false,
        ids: (req.params[0].split("/")[1]) ? req.params[0].split("/")[1].split(",") : [],
        filter: (req.query.filter) ? req.query.filter.split("|") : []
      }
      rpc.Get(req.authInfo.token, params, function(err, data){
        if(err){
          sendResult(res, 400, {code:400, message: err})
        } else {
          sendResult(res, 200, data);
        }
      })
    } else {
      switch (datatype) {
        case "auth":
        case "database":
        case "report":
        case "service":
          sendResult(res, 200);
          break;
      
        default:
          sendResult(res, 404);
          break;
      }
    }
  } else {
    sendResult(res, 404);
  }
});

router.post('/*', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var datatype = req.path.split("/")[1]
  if (datatype && Models.includes(datatype)){
    rpc.Update(req.authInfo.token, {nervatype: datatype, data: req.body}, 
      function(err, results){
        if(err){
          sendResult(res, 400, {code:400, message: err})
        } else {
          sendResult(res, 200, results)
        }
    })
  } else {
    sendResult(res, 404);
  }
});

router.delete('/*', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var datatype = req.path.split("/")[1]
  if (datatype && Models.includes(datatype)){
    var params = req.query
    params.nervatype = datatype
    rpc.Delete(req.authInfo.token, params, function(err, id){
      if(err){
        sendResult(res, 400, {code:400, message: err})
      } else {
        sendResult(res, 204)
      }
    })
  } else {
    sendResult(res, 404);
  }
});

function sendResult(res, code, data){
  res.set('Content-Type', 'application/json');
  if(data){
    if(typeof data === "string"){
      res.set('Content-Type', 'text/plain');
    }
    res.status(code).send(data)
  } else {
    res.sendStatus(code)
  }
}

module.exports = router;
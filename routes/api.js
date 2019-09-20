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

var ntura = require('nervatura').models;
var api = require('nervatura').api;

router.use(function (req, res, next) {
  next()
});

router.post('/auth/login', function (req, res, next) {
  api(req.user).AuthUserLogin(req.body, function(err, data){
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
    if(!params.username && !params.custnumber){
      if(req.user.customer()){
        params.custnumber = req.user.customer().custnumber
      } else {
        params.username = req.user.employee().username
      }
    }
    api(req.user).AuthPassword(params, function(err, data){
      if(err){
        sendResult(res, 400, {code:400, message: err})
      } else {
        sendResult(res, 204);
      }
    })
  }
});

router.get('/auth/refresh', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  sendResult(res, 200, api(req.user).AuthToken())
})

router.get('/report', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var params = req.query
  api(req.user).Report(params, function(err, data){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      var result
      if(params.output === "tmp"){
        res.set('Content-Type', 'application/json');
        result = data
      } else {
        if(data.filetype === "xlsx"){
          res.setHeader('Content-Disposition', 'attachment; filename=Report.xlsx');
          res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          result = data.template
        } else {
          if(data.filetype === "ntr" && params.output === "xml"){
            res.setHeader('Content-Disposition', 'attachment; filename=Report.xml');
            res.set('Content-Type', 'application/xml');
            result = data.template
          } else {
            res.setHeader('Content-Disposition', 'attachment; filename=Report.pdf');
            res.set('Content-Type', 'application/pdf');
            result = data.template
          }
        }
      }
      res.status(200).send(result)
    }
  })
});

router.get('/report/list', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var params = { filters: { group: req.query.label } }
  if(req.authInfo.scope === "admin"){
    api(req.user).ReportList(params, function(err, data){
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
    api(req.user).ReportInstall(req.query, function(err, id){
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
    api(req.user).ReportDelete(req.query, function(err, data){
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
  if(req.headers["x-api-key"] === process.env.NT_API_KEY){
    var params = { database: req.query.alias, demo: req.query.demo || "false" }
    api(req.user).DatabaseCreate(params, function(err, results){
      if(err){
        sendResult(res, 400, {code:400, message: err, data: results})
      } else {
        sendResult(res, 200, results);
      }
    })
  } else {
    sendResult(res, 401);
  }
});

router.post('/function', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  api(req.user).ApiFunction(req.body, function(err, results){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      sendResult(res, 200, results);
    }
  })
});

router.post('/view', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  api(req.user).ApiView(req.body, function(err, results){
    if(err){
      sendResult(res, 400, {code:400, message: err})
    } else {
      sendResult(res, 200, results);
    }
  })
});

router.get('/*', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  var datatype = req.path.split("/")[1]
  if(datatype && ntura.model.hasOwnProperty(datatype)) {
    var params = req.query
    if (ntura.model.hasOwnProperty(datatype)){
      params.nervatype = datatype
      params.ids = req.params[0].split("/")[1]
      api(req.user).ApiGet(params, function(err, data){
        if(err){
          sendResult(res, 400, {code:400, message: err})
        } else {
          sendResult(res, 200, data)
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
  if (datatype && ntura.model.hasOwnProperty(datatype)){
    api(req.user).ApiPost({nervatype: datatype, data: req.body}, 
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
  if (datatype && ntura.model.hasOwnProperty(datatype)){
    var params = req.query
    params.nervatype = datatype
    api(req.user).ApiDelete(params, function(err, id){
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
    res.status(code).send(data)
  } else {
    res.sendStatus(code)
  }
}

module.exports = router;
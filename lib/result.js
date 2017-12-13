/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2017, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var path = require('path');

exports.sendResult = function(res, params){
  switch (params.type) {
    case "error":
      res.set('Content-Type', 'text/json');
      res.send({"id":params.id || -1, "jsonrpc": "2.0", 
        "error": {"code": params.ekey, "message": params.err_msg, "data": params.data}});
      break;
    
    case "csv":
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment;filename='+params.filename+'.csv');
      res.send(params.data);
      break;
    
    case "html":
      res.set('Content-Type', 'text/html');
      res.render(path.join(params.views, (params.dir || "template"), params.tempfile), params.data);
      break;
    
    case "xml":
      res.set('Content-Type', 'text/xml');
      res.render(path.join(params.views, "template", params.tempfile), params.data);
      break;
    
    case "json":
      res.set('Content-Type', 'text/json');
      res.send({"id": params.id, "jsonrpc": "2.0", "result": params.data});
      break;

    default:
      res.send(params);
      break; }}
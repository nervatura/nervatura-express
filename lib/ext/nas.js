var async = require("async");
var fs = require('fs');
var zlib = require('zlib');
var path = require('path');
var xml2js = require('xml2js');

var ntura = require('nervatura').models;
var models = require('nervatura').adapter.models();
var connect = require('nervatura').adapter.connect();
var tool = require('nervatura').tools.NervaTools();
var out = require('nervatura').tools.DataOutput();
var nas = require('nervatura').nas();

module.exports = function() {

function valid(req){
  if (req.app.get("host_settings").nas_host_restriction.length>0 && req.app.get("host_settings").nas_host_restriction.indexOf(req.ip)===-1){
    return "/login/insecure";}
  else if (req.app.get("host_settings").nas_host_restriction.length===0 && req.app.get("host_settings").all_host_restriction.length>0 
    && req.app.get("host_settings").all_host_restriction.indexOf(req.ip)===-1){
    return "/login/insecure";}
  else if (req.user){
    return "ok";}
  else {return "/login";}}

function valid_setting(nas_login, params, lang){
  switch (params.fieldname) {
    case "nas_auth":
      switch (params.value) {
        case "local":
          return(null);
        case "amazon":
          if(nas_login.amazon.clientID && nas_login.amazon.clientSecret){
              return(null);}
          else {
            return(lang.missing_params+": clientID, clientSecret");}
        case "azure":
          if(nas_login.azure.clientID && nas_login.azure.clientSecret 
            && nas_login.azure.redirectUrl && nas_login.azure.identityMetadata){
              return(null);}
          else {
            return(lang.missing_params+": clientID, clientSecret, redirectUrl, identityMetadata");}
        case "google":
          if(nas_login.google.clientID && nas_login.google.clientSecret){
              return(null);}
          else {
            return(lang.missing_params+": clientID, clientSecret");}  
        default:
          return(lang.invalid_fieldname+" "+params.value+" (local, amazon, azure, google)");}
  
    default:
      return(null);}}

function get_nstore_prm(req){
  return { conf: req.app.get("conf"), data_dir: req.app.get("data_dir"), report_dir: req.app.get("report_dir"),
    host_ip: req.ip, host_settings: req.app.get("host_settings"), storage: req.app.get("storage"),
    lang: req.app.locals.lang }
}

function page_render(params){
  if (!params.data){
    params.data = {};}
  if (!params.dir){
    params.dir = "nas"
    params.data.page_view = params.page;}
  else {
    params.data.view = params.page;}
  if(params.data.view){
    params.data.page_view += "_"+params.data.view;}
  params.res.render(params.dir+"/index.html",params.data);
}

function user_list(params){
  params.req.app.settings.storage.getUsers(function(err, users){
    if (err) {return params.next(err);}
    else {
      params.page = "user";
      params.data.users = users;
      params.data.subtitle = params.req.app.locals.lang.label_accounts;
      page_render(params);}});}

function database_list(params){
  params.req.app.settings.storage.getDatabases(function(err, data){
    if (err) {return params.next(err);}
    else {
      params.page = "database";
      params.data.data = data;
      if (!params.data.view){
        params.data.view = "list";
        params.data.subtitle = params.req.app.locals.lang.label_databases;}
      page_render(params);}});}

function import_list(params){
  fs.readdir(params.data.import_dir, function(err, files){
    if (err) {return params.next(err);}
    else {
      files.forEach(function(filename) {
        if(filename.indexOf(".xml")>-1 || filename.indexOf(".data")>-1){
          params.data.filenames.push(filename);}});
      params.data.filenames.unshift("");
      database_list(params);}});}

function setting_list(params){
  params.req.app.settings.storage.getSettings(function(err, settings){
    if (err) {return params.next(err);}
    else {
      params.page = "setting";
      params.data.settings = settings;
      params.data.subtitle = params.req.app.locals.lang.label_settings;
      page_render(params);}});}

function report_render(params){
  params.storage.getDatabases(function(err, data){
    if (err && params.flash === null) {
      params.flash = err;}
    params.page = "report";
    if (!params.data.view){
      params.data.view = "list";}
    if(data.length===0){
      data.unshift({doc:{alias:""}});}
    params.data.form.database = data;
    params.data.form.groups = [
      "", "bank", "cash", "customer", "delivery", "employee", "formula", "inventory", "invoice", "offer", 
      "order", "product", "production", "project", "rent", "report", "tool", "waybill", "worksheet"];
    page_render(params);});}

function report_list(nstore, params, flash){
  nas.getDbsReports(nstore, {database:params.form.alias}, function(err, reports){
    if (err !== null){
      report_render({res:params.res, storage:nstore.storage(), 
        data:{subtitle:nstore.lang().label_reports, form:{}, flash:err}});}
    else if (params.form.engine) {
      tool.getReportFiles(nstore, {filters:params.form, dbs_reports:reports.report}, function(err, files){
        if (err !== null && flash === null){
          flash =err;}
        else {
          params.form.files = files;}
        report_render({res:params.res, storage:nstore.storage(), 
          data:{subtitle:nstore.lang().label_reports, form:params.form, flash:flash}});});}
    else {
      report_render({res:params.res, storage:nstore.storage(), 
        data:{subtitle:nstore.lang().label_reports, form:params.form, flash:flash}});}});}

function report_install(nstore, params){
  tool.installReport(nstore,{filename:params.form.update_reportkey}, 
    function(err, report_id, reportkey){
      report_list(nstore, params, err);});}

function report_update(nstore, params, _callback) {
  var conn; var trans;
  async.waterfall([
    function(callback) {
      conn = nstore.connect.getConnect();
      if (!conn){
        callback(nstore.lang().not_connect);}
      else {
        trans = connect.beginTransaction({connection:conn, engine:nstore.engine()});
        if(params.template){
          var _sql = {update:"ui_report", set:[[],["report","=","?"]], where:["id","=","?"]}
          trans.query(models.getSql(nstore.engine(), _sql), [params.template, params.report_id], 
            function (err, data) {
              callback(err);});}
        else {
          callback(null);}}},
    
    function(callback) {
      var labels = [];
      for (var key in params) {
        if (key.split("_")[0] === "label" && key.split("_").length > 1) {
          labels.push({id:key.split("_")[1], value:params[key]});}}
      if(labels.length > 0){
        var label_lst = [];
        var sql = models.getSql(nstore.engine(), 
          {update:"ui_message", set:[[],["msg","=","?"]], where:["id","=","?"]});
        labels.forEach(function(label) {
          label_lst.push(function(callback_){
            trans.query(sql, [label.value, label.id], function (err, data) {
              callback_(err,data);});});});
        async.series(label_lst,function(err,data) {
          callback(err);;});}
      else {
        callback(null);}}
  ],
  function(err) {
    if(err){if(err.message){err = err.message;}}
    if (!err && trans){
      if(trans.commit){
        trans.commit(function (err) {
        if (!err){conn.close();}
        _callback(err);});}
      else{
        conn.close();
        _callback(null);}}
    else {
      if (trans){if (trans.rollback){trans.rollback();}}
      if (conn){conn.close();}
      _callback(err);}});}

function report_edit(nstore, params){
  nas.getDbsReports(nstore, {database:params.form.alias, reportkey:params.form.update_reportkey}, 
    function(err, report){
      if (err !== null){
        report_render({res:params.res, storage:nstore.storage(), 
          data:{subtitle:nstore.lang().label_reports, form:params.form, flash:err}});}
      else {
        params.form.report = report.report;
        params.form.labels = report.label;
        report_render({res:params.res, storage:nstore.storage(), 
          data:{view:"edit", subtitle:nstore.lang().label_reports, form:params.form, flash:null}});}});}

function export_database(nstore, params, _callback){
  var conn; var timestamp = Date.now(); var logstr = "";
  if(params.logstr){logstr = params.logstr;}
  async.waterfall([
    function(callback) {
      logstr = '<div><span style="font-weight: bold;">'
        +nstore.lang().log_database_alias+': '+params.database+'</span><br>';
      logstr += '<span>'+nstore.lang().label_format+': '
        +params.format+'</span><br>';
      logstr += '<span>Ver.No: '+params.version+'</span></div><br>';
      logstr += '<div><span>'+nstore.lang().log_start_process+': '
        +out.getISODateTime(new Date(),true)+'</span></div>';
      //check connect
      nstore.local.setEngine({database:params.database}, function(err,result){
        callback(err);});},
    
    function(callback) {
      conn = nstore.connect.getConnect();
      if (!conn){
        callback(nstore.lang().not_connect);}
      else {
        var ndi = require('nervatura').ndi();
        var value_lst = [];
        var ndi_params = {validator:{conn:conn}, check_audit:false, use_deleted:true}
        var ndi_filter = {output:"json", no_deffield:true, orderby:"id"}
        models.exportList.nom.forEach(function(nom) {
          value_lst.push(function(callback_){
            ndi_params.datatype = nom;
            ndi.getData(nstore, ndi_params, ndi_filter, function (err, result) {
              if(!err){
                logstr += '<div><span>'+result.datatype+' rows: '
                  +result.data.length+'</span></div>';}
              callback_(err,result);});});});
        async.series(value_lst,function(err, results) {
          callback(err, results);});}},
            
    function(nom_data, callback) {
      var value_lst = []; var value_index = 0;
      var ui_lst = models.exportList.ui_1.concat(models.exportList.ui_2);
      ui_lst.forEach(function(ui) {
        value_lst.push(function(callback_){
          var _sql;
          switch (ui) {
            case "ui_audit":
              _sql = {
                select:["ug.groupvalue as usergroup","nt.groupvalue as nervatype", 
                  "case when r.id is null then st.groupvalue else r.reportkey end as subtype", 
                  "ipf.groupvalue as inputfilter","a.supervisor"],
                from:"ui_audit a",
                inner_join:[["groups ug","on",["a.usergroup","=","ug.id"]],
                  ["groups nt","on",["a.nervatype","=","nt.id"]],
                  ["groups ipf","on",["a.inputfilter","=","ipf.id"]]],
                left_join:[["groups st","on",["a.subtype","=","st.id"]],
                  ["ui_report r","on",["a.subtype","=","r.id"]]],
                order_by:["a.id"]}
              break;
            case "ui_menufields":
              _sql = {
                select:["m.menukey","mf.fieldname","mf.description","ft.groupvalue as fieldtype","mf.orderby"],
                from:"ui_menufields mf",
                inner_join:[["ui_menu m","on",["mf.menu_id","=","m.id"]],
                  ["groups ft","on",["mf.fieldtype","=","ft.id"]]],
                order_by:["mf.id"]}
              break;
            case "ui_reportfields":
              _sql = {
                select:["r.reportkey","rf.fieldname","ft.groupvalue as fieldtype","wt.groupvalue as wheretype",
                  "rf.description","rf.orderby","rf.sqlstr","rf.parameter","rf.dataset","rf.defvalue","rf.valuelist"],
                from:"ui_reportfields rf",
                inner_join:[["ui_report r","on",["rf.report_id","=","r.id"]],
                  ["groups ft","on",["rf.fieldtype","=","ft.id"]],
                  ["groups wt","on",["rf.wheretype","=","wt.id"]]],
                order_by:["rf.id"]}
              break;
            case "ui_reportsources":
              _sql = {
                select:["r.reportkey","rs.dataset","rs.sqlstr"],
                from:"ui_reportsources rs",
                inner_join:["ui_report r","on",["rs.report_id","=","r.id"]],
                order_by:["rs.id"]}
              break;
            case "ui_userconfig":
              _sql = {
                select:["e.empnumber","c.section","c.cfgroup","c.cfname","c.cfvalue","c.orderby"],
                from:"ui_userconfig c",
                inner_join:["employee e","on",["c.employee_id","=","e.id"]],
                order_by:["c.id"]}
              break;
            default:
              _sql = {select:["*"], from:ui, order_by:["id"]}
              break;}
          conn.query(models.getSql(nstore.engine(),_sql), [], function (err, data) {
            if(!err){
              var result = {datatype:ui_lst[value_index], data:[]}
              value_index += 1;
              data.rows.forEach(function(row) {
                var item = [];
                for (var field in row) {
                  var item_field = {name:field, value:row[field]};
                  if (ntura.model.hasOwnProperty(result.datatype)){
                    if (ntura.model[result.datatype].hasOwnProperty(field)){
                      if (ntura.model[result.datatype][field].hasOwnProperty("references")){
                        item_field.type = ntura.model[result.datatype][field].references[0];}
                      else {
                        item_field.type = ntura.model[result.datatype][field].type;}}
                    else if (!item_field.type){
                      item_field.type = "reference";}}
                  item.push(item_field);};
                result.data.push(item);});
              logstr += '<div><span>'+result.datatype+' rows: '
                +result.data.length+'</span></div>';
              callback_(null,result);}
            else {callback_(err,null);}});});});
      async.series(value_lst,function(err, results) {
        callback(err, nom_data.concat(results));});},
    
    function(result, callback) {
      var xml_params = {dbs:result, version:params.version,
        timestamp:timestamp}
      params.res.render("nas/export.xml", xml_params, function(err,xml){
        callback(err, xml);});},
    
    function(result, callback) {
      if (params.format === "data"){
        params.bck_filename = params.database+"_"+timestamp+".data"
        zlib.deflate(result, function (err, buffer) {
          if(!err && params.filename === "download"){
            params.res.set('Content-Type', 'application/octet-stream');
            params.res.set('Content-Disposition', 'attachment;filename="'+params.bck_filename+'"');}
          callback(err, buffer);});}
      else {
        params.bck_filename = params.database+"_"+timestamp+".xml"
        if(params.filename === "download") {
          params.res.set('Content-Type', 'text/xml');
          params.res.set('Content-Disposition', 'attachment;filename="'+params.bck_filename+'"');}
        callback(null, result);}},
    
    function(result, callback) {
      if(params.filename !== "download") {
        fs.writeFile(path.join(params.export_dir, params.bck_filename), result, function (err) {
          if(!err){
            logstr += '<br><div><span>'+nstore.lang().label_export+': </span>';
            logstr += params.bck_filename+'</div>';}
          callback(err, result);});}
      else {callback(null, result);}}
  ],
  function(err, result) {
    if(err){if(err.message){err = err.message;}}
    if (conn){conn.close();}
    if(err || params.filename !== "download"){
      if (!err){
        logstr += '<div><span style="font-weight: bold;">'
          +nstore.lang().info_export_ok+'</span></div>';}
      else {
        logstr += '<div><span style="color:red;font-weight: bold;">'
          +nstore.lang().log_error+': '+err+'</span></div>';}
      logstr += '<div><span>'+nstore.lang().log_end_process+': '
        +out.getISODateTime(new Date(),true)+'</span></div>';}
    _callback(err, logstr, result);});}

function import_database(nstore, params, _callback){
  var conn; var logstr = "";
  if(params.logstr){logstr = params.logstr;}
  async.waterfall([
    function(callback) {
      logstr = '<div><span style="font-weight: bold;">'
        +nstore.lang().log_database_alias+': '+params.database+'</span><br>';
      logstr += '<span>'+nstore.lang().label_export_file+': '
        +params.filename+'</span><br>';
      logstr += '<div><span>'+nstore.lang().log_start_process+': '
        +out.getISODateTime(new Date(),true)+'</span></div>';
      if (!params.filename || params.filename===""){
        callback(nstore.lang().missing_required_field+" "+nstore.lang().label_export_file);}
      else if (!params.database || params.database===""){
        callback(nstore.lang().missing_required_field+" "+nstore.lang().label_database);}
      else {
        //check connect
        nstore.local.setEngine({database:params.database}, function(err,result){
          callback(err);});}},
        
    function(callback) {
      conn = nstore.connect.getConnect();
      if (!conn){
        callback(nstore.lang().not_connect);}
      else {
        logstr += '<div><span>'+nstore.lang().log_load_data+'</span></div>';
        fs.readFile(path.join(params.import_dir, params.filename),function(err, data) {
          callback(err, data);});}},
    
    function(data, callback) {
      if(params.filename.indexOf(".data") > -1){
        zlib.inflate(data, function (err, idata) {
          callback(err, idata);});}
      else {
        callback(null, data);}},
        
    function(data, callback) {
      var parser = new xml2js.Parser();
      parser.parseString(data, function (err, xdata) {
        callback(err, xdata);});},
    
    function(data, callback) {
      var dbs_params = {conn:conn, database:params.database, 
        logstr:logstr, empty:true}
      nas.createDatabase(nstore, dbs_params, function(err, create_log){
        logstr = create_log;
        callback(null, data);});},
    
    function(data, callback) {
      var ndi = require('nervatura').ndi();
      var value_lst = [];
      var ndi_params = {
        validator:{conn:conn}, log_enabled:false, insert_row:true, 
          insert_field:true, check_audit:false, use_deleted:true}
      models.exportList.nom.forEach(function(nom) {
        if(data.data[nom]){
          var items = [];
          data.data[nom].forEach(function(fields) {
            var item = {};
            fields.field.forEach(function(field) {
              item[field.name[0]] = field.value[0];});
            items.push(item);});}
        value_lst.push(function(callback_){
          ndi_params.datatype = nom;
          ndi.updateData(nstore, ndi_params, items, function(err, result){
            if(!err){
              logstr += '<div><span>'+nom+": "+result.data.length+' rows</span></div>';}
            callback_(err);});});});
      async.series(value_lst,function(err) {
        callback(err,data);})},
    
    function(data, callback) {
      var value_lst = [];
      models.exportList.ui_1.forEach(function(ui) {
        var ui_count = 0;
        if(data.data[ui]){
          data.data[ui].forEach(function(fields) {
            var _sql = {}; var prm = []; ui_count +=1;
            _sql = {insert_into:[ui,[[]]], values:[[]]};
            fields.field.forEach(function(field) {
              if(field.value[0] !== ""){
                _sql.insert_into[1].push(field.name[0]);
                _sql.values.push("?");
                prm.push(field.value[0]);}});
            value_lst.push(function(callback_){
              conn.query(models.getSql(nstore.engine(),_sql), prm, function (err, idata) {
                callback_(err);});});});}
          logstr += '<div><span>'+ui+": "+ui_count+' rows</span></div>';});
      async.series(value_lst,function(err) {
        callback(err,data);})},
    
    function(data, callback) {
      var _sql = [
        {select:["'empnumber' as keyname","'employee_id' as refname","empnumber as vkey","id"], from:"employee"},
        {union_select:["'menukey' as keyname","'menu_id' as refname","menukey as vkey","id"], from:"ui_menu"},
        {union_select:["'reportkey' as keyname","'report_id' as refname","reportkey as vkey","id"], from:"ui_report"},
        {union_select:["'usergroup' as keyname","'usergroup' as refname","groupvalue as vkey","id"], 
          from:"groups", where:["groupname","=","'usergroup'"]},
        {union_select:["'nervatype' as keyname","'nervatype' as refname","groupvalue as vkey","id"], 
          from:"groups", where:["groupname","=","'nervatype'"]},
        {union_select:["'transtype' as keyname","'transtype' as refname","groupvalue as vkey","id"], 
          from:"groups", where:["groupname","=","'transtype'"]},
        {union_select:["'inputfilter' as keyname","'inputfilter' as refname","groupvalue as vkey","id"], 
          from:"groups", where:["groupname","=","'inputfilter'"]},
        {union_select:["'fieldtype' as keyname","'fieldtype' as refname","groupvalue as vkey","id"], 
          from:"groups", where:["groupname","=","'fieldtype'"]},
        {union_select:["'wheretype' as keyname","'wheretype' as refname","groupvalue as vkey","id"], 
          from:"groups", where:["groupname","=","'wheretype'"]}]
      conn.query(models.getSql(nstore.engine(),_sql), [], function (err, edata) {
        if (!err){
          edata.rows.forEach(function(row) {
            if (!data[row.keyname]){data[row.keyname] = {};}
            data[row.keyname][row.vkey] = {refname:row.refname, id:row.id};});}
        callback(err,data);});},
  
    function(data, callback) {
      var value_lst = [];
      models.exportList.ui_2.forEach(function(ui) {
        var ui_count = 0;
        if(data.data[ui]){
          data.data[ui].forEach(function(fields) {
            var _sql = {}; var prm = []; ui_count +=1;
            _sql = {insert_into:[ui,[[]]], values:[[]]};
            var last_nervatype;
            fields.field.forEach(function(field) {
              if(field.value[0] !== ""){
              switch (field.name[0]) {
                case "subtype":
                  _sql.insert_into[1].push("subtype");
                  _sql.values.push("?");
                  if(last_nervatype === "trans"){  
                    prm.push(data.transtype[field.value[0]].id);}
                  else if(last_nervatype === "report"){
                    prm.push(data.reportkey[field.value[0]].id);}
                  else{prm.push(null);}
                  break;
                case "empnumber":
                case "menukey":
                case "reportkey":
                case "usergroup":
                case "nervatype":
                case "inputfilter":
                case "fieldtype":
                case "wheretype":
                  _sql.insert_into[1].push(data[field.name[0]][field.value[0]].refname);
                  _sql.values.push("?");
                  prm.push(data[field.name[0]][field.value[0]].id);
                  if(field.name[0]==="nervatype"){
                    last_nervatype = field.value[0];}
                  break;
                default:
                  _sql.insert_into[1].push(field.name[0]);
                  _sql.values.push("?");
                  prm.push(field.value[0]);
                  break;}}});
            value_lst.push(function(callback_){
              conn.query(models.getSql(nstore.engine(),_sql), prm, function (err, idata) {
                callback_(err);});});});}
          logstr += '<div><span>'+ui+": "+ui_count+' rows</span></div>';});
      async.series(value_lst,function(err) {
        callback(err);})},
  
    function(callback) {
      if(models.compact(nstore.engine()) !== null){
        conn.query(models.compact(nstore.engine()), [], function (err, data) {
          if (!err){
            logstr += '<div><span>Rebuilding the database...</span></div>';}
          callback(err);});}
      else {callback(null);}}
  ],
  function(err) {
    if(err){if(err.message){err = err.message;}}
    if (!err){
      logstr += '<div><span style="font-weight: bold;">'+nstore.lang().info_import_ok+'</span></div>';}
    else {
      logstr += '<div><span style="color:red;font-weight: bold;">'+nstore.lang().log_error+': '+err+'</span></div>';}
    if (conn){conn.close();}
    logstr += '<div><span>'+nstore.lang().log_end_process+': '+out.getISODateTime(new Date(),true)+'</span></div>';
    _callback(err, logstr);});}

return {
  validUser: function(req) {
    return valid(req);},
  validSetting: function(conf, params, lang) {
    return valid_setting(conf, params, lang);},
  getNstoreParams(req){
    return get_nstore_prm(req);},
  pageRender: function(params) {
    page_render(params);},
    
  userList: function(params) {
    user_list(params);},
  databaseList: function(params) {
    database_list(params);},
  importList: function(params) {
    import_list(params);},
  settingList: function(params) {
    setting_list(params);},
  
  reportRender: function(params) {
    report_render(params);},
  reportList: function(nstore, params, flash) {
    report_list(nstore, params, flash);},
  reportInstall: function(nstore, params) {
    report_install(nstore, params);},
  reportEdit: function(nstore, params) {
    report_edit(nstore, params);},
  reportUpdate: function(nstore, params, _callback) {
    report_update(nstore, params, _callback);},
  
  exportDatabase: function(nstore, params, _callback) {
    export_database(nstore, params, _callback);},
  importDatabase: function(nstore, params, _callback) {
    import_database(nstore, params, _callback);},
  }
}
/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2017, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var out = require('nervatura').tools.DataOutput();
var basicStore = require('nervatura').storage.basicStore

module.exports = function(params) {
  if(params.host_type === "gae"){
    //Google App Engine
    return dataStore(params);}
  else {
    switch (params.data_store) {
      case "memory":
        return basicStore(params);
      case "lokijs":
        return lokiStore(params);
      case "pouchdb":
        return levelStore(params);
      case "datastore":
        return dataStore(params);
      default:
        return lokiStore(params);
    }
  }
}

function dataStore(options) {
  var self = this;
  var store = require('@google-cloud/datastore')();
  //Emulator: ({ projectId:"localhost", apiEndpoint:"http://localhost:8081"});
  
  function get_groups(gtype, callback){
    store.runQuery(store.createQuery(gtype), function(err, entities, info) {
      callback(err, entities);});}
  
  function get_users(callback){
    get_groups("user",function(err, data){
      if (err) {return callback(err, null);}
      var users = [];
      data.forEach(function(user) {
        users.push(user.username);});
      return callback(err, users);});}

  function get_md5_password(password){
    if (typeof password === "undefined" || password === "" || password === null) {
      password = "";}
    else {password = out.createHash(password,"hex");}
    return password;}
  
  function get_user(params, callback){
    function get_data(_callback){
      if(params.hasOwnProperty("id")){
        store.runQuery(store.createQuery("user").filter("id", params.id), function(err, entities, info) {
          if(entities.length > 0){
            _callback(err, entities[0]);}
          else {
            _callback(err, null);}})}
      else {
        store.get(store.key(['user', params.username]), function (err, data) {
          _callback(err, data);})}}

    get_data(function (err, data) {
      if (err) {
        return callback(err);}
      else if (!data) {
        return callback(null, false, {message:options.lang.unknown_user, username: params.username});}
        
      var user = {id:data.id, username:data.username};
      if(params.token) {
        user.token = params.token; user.password = null;
        if( !data.token || (data.token !== user.token)){
          update_data("user", user.username, user, function(err, msg){
            if(!err){
              return callback(null, user); }
            else{
              return callback(null, false, {message:msg, username: user.username});}})}
        else {
          return callback(null, user);}}
      else {
        if(data.password === get_md5_password("empty")){
          user.dirty_password = true;}
        if (params.password !== null){
          if (data.password != get_md5_password(params.password)) {
            return callback(null, false, {message: options.lang.wrong_password, username: user.username});}
          else {
            return callback(null, user);}}
        else {
          return callback(null, user);}}});}

  function update_data(collection, key, values, callback){
    for (var fieldname in values) {
      switch (fieldname) {
        case "_csrf":
          break;
        case "password":
          if (!values.hasOwnProperty(fieldname) || values[fieldname] === "" 
            || values[fieldname] === null){
            values[fieldname] = "empty";}
            values[fieldname] = get_md5_password(values[fieldname]);
          break;
        default:
          if (!values.hasOwnProperty(fieldname) || values[fieldname] === null){
            values[fieldname] = "";}
          values[fieldname] = values[fieldname];
          break;}}
    if(!values.hasOwnProperty("id")){
      values.id = new Date().getTime();}
    var entity = {key: store.key([collection, key]), data: values}
    store.save(entity, function(err) {
      if (err && callback) {
        return callback(err, options.lang.update_error);}
      else if (callback) {
        return callback(null, options.lang.update_ok);}})}
  
  function get_dbs_doc(values){
    var vdata = {connect:{}, settings:{}};
    for (var fieldname in values) {
      switch (fieldname) {
        case "ndi_enabled":
        case "db_ssl":
          if(values[fieldname] !== "true"){
            vdata.settings[fieldname] = false;}
          else{
            vdata.settings[fieldname] = true;}
          break;
        case "encrypt_password":
          vdata.settings[fieldname] = values[fieldname];
          break;
        case "dbs_host_restriction":
          vdata.settings[fieldname] = values[fieldname];
          break;
        case "port":
          if(values[fieldname].toString().length === 0){
            vdata.connect[fieldname] = "";}
          else if(values[fieldname].toString()[0] === "$"){
            vdata.connect[fieldname] = values[fieldname].trim();}
          else {
            vdata.connect[fieldname] = parseInt(values[fieldname],10);
            if (isNaN(vdata.connect[fieldname])){
              vdata.connect[fieldname] = 0;}}
          break;
        case "host":
        case "dbname":
        case "username":
        case "password":
          vdata.connect[fieldname] = values[fieldname];
          break;
        default:
          vdata[fieldname] = values[fieldname];
          break;}}
    vdata.connect = out.cryptedValue(values.alias, JSON.stringify(vdata.connect), "hex");
    vdata.time_stamp = new Date().toISOString();
    return vdata;}
  
  function delete_data(collection, key, callback){
    function _delete(){
      store.delete(store.key([collection, key]), function(err, apiResp) {
        if(err) {
          return callback(null, options.lang.update_error);}
        else {
          return callback(null, options.lang.data_deleted);}});}

    store.get(store.key([collection, key]), function (err, data) {
      if (err) {
        return callback(err);}
      else if (!data) {
        if (collection === "user"){
          return callback(null,options.lang.unknown_user);}
        else {
          return callback(null, null);}}
      else{
        if (collection === "user"){
          store.runQuery(store.createQuery('user'), function(err, entities) {
            if (entities.length === 1){
              return callback(null, options.lang.user_delete_err);}
            else {
              _delete();}});}
        else {
          _delete();}}});}

  function change_password(username, old_passw, new_passw, ver_passw, callback){
    store.get(store.key(['user', username]), function (err, data) {
      if (err) { 
        return callback(err, err);}
      if (!data) {
        return callback(null, options.lang.unknown_user);}
        
      if (data.password != get_md5_password(old_passw)) {
        return callback(null, options.lang.wrong_password);}
      else if (new_passw === null || new_passw === "") {
        return callback(null, options.lang.empty_password);}
      else if (new_passw !== ver_passw) {
        return callback(null, options.lang.verify_password);}
      else {
        data.password = get_md5_password(new_passw);
        var entity = {key: store.key(["user", username]), data: data}
        store.save(entity, function(err, response) {
          if (err && callback) {
            return callback(err, options.lang.update_error);}
          else if (callback) {
            return callback(null, options.lang.changed_password);}});}});}

  var result = {
    getDataStore: function(){
      return store;},
      
    getUsers: function(callback){
      return get_users(callback);},
    getSettings: function(callback){
      return get_groups("setting", callback);},
    getDatabases: function(callback){
      return get_groups("dbs", callback);},  
    
    newUser: function(values, callback){
      if (typeof values.username === "undefined" || values.username === "" 
        || values.username === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data("user", values.username, values, callback);}},
    changePassword: function(username, old_passw, new_passw, ver_passw, callback){
      return change_password(username, old_passw, new_passw, ver_passw, callback);},
    updateDatabase: function(values, callback){
      if (typeof values.alias === "undefined" || values.alias === "" || values.alias === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data("dbs", values.alias, get_dbs_doc(values), callback);}},
    updateSetting: function(values, callback){
      if (typeof values.fieldname === "undefined" || values.fieldname === "" 
        || values.fieldname === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data("setting", values.fieldname, values, callback);}},
            
    deleteUser: function(username, callback){
      return delete_data("user", username, callback);},
    deleteSetting: function(fieldname, callback){
      return delete_data("setting", fieldname, callback);},
    deleteDatabase: function(alias, callback){
      return delete_data("dbs", alias, callback);},
      
    getUserFromName: function(username, password, callback){
      get_user({username: username, password: password}, callback);},
    getUserFromId: function(id, callback){
      get_user({id: id, password: null}, callback);},
    getUserFromEmail: function(email, profile, token, callback){
      get_user({username: email, password: null, 
        profile: profile, token: token}, callback);},
    getSettingFromFieldname: function(fieldname, callback){
      store.get(store.key(['setting', fieldname]), function (err, data) {
        if (err) {return callback(err, null);}
        else {return callback(err, data);}});},
    getDbsFromAlias: function(alias, callback){
      store.get(store.key(['dbs', alias]), function (err, data) {
        if (err) {return callback(err,null);}
        else {
          data.connect = JSON.parse(out.decipherValue(alias, data.connect, "hex"));
          return callback(err, data);}});}
  }

  store.runQuery(store.createQuery('user'), function(err, entities) {
    var settings={};
    if (!err) {
      if (entities.length === 0){
        var items = []; var index;
        for (const alias in options.databases) {
          items.push({
            key: store.key(['dbs', alias]),
            data: {
              id: new Date().getTime(),
              alias: alias, 
              engine: options.databases[alias].engine,
              connect: out.cryptedValue(alias, JSON.stringify(options.databases[alias].connect), "hex"), 
              settings: options.databases[alias].settings, 
              time_stamp: new Date().toISOString()}});}
        for (index = 0; index < options.conf.users.length; index++) {
          items.push({
            key: store.key(['user', options.conf.users[index].username]),
            data: {
              id: new Date().getTime(),
              username: options.conf.users[index].username,
              password: get_md5_password("empty")}});}
        for (index = 0; index < options.conf.settings.length; index++) {
          settings[options.conf.settings[index].fieldname] = options.conf.settings[index].value;
          items.push({
            key: store.key(['setting', options.conf.settings[index].fieldname]),
            data: {
              id: new Date().getTime(),
              fieldname: options.conf.settings[index].fieldname,
              value: options.conf.settings[index].value, 
              description: options.conf.settings[index].description}});}
        store.save(items, function(err, apiResponse) {
          if(options.callback){options.callback(err, result, settings);}});}
      else {
        get_groups("setting",function(serr, settings_arr){
          settings_arr.forEach(function(element) {
            settings[element.fieldname] = element.value;});
          if(options.callback){
            options.callback(serr, result, settings);}});}}
    else{
      if(options.callback){options.callback(err, result, {});}}});
  return result;
}

function lokiStore(options) {
  var LokiJS = require('lokijs');
  var store = new LokiJS(options.data_dir+'/storage/data.json');

  function to_object(arr){
    var obj = {}
    arr.forEach(function(element) {
      obj[element.key] = element.value;});
    return obj;}

  function get_groups(gtype){
    var gcol = store.getCollection(gtype);
    if(gcol){
      return JSON.parse(JSON.stringify(store.getCollection(gtype).data));}
    else{return []}}  
    
  function get_md5_password(password){
    if (typeof password === "undefined" || password === "" || password === null) {
      password = "";}
    else {password = out.createHash(password,"hex");}
    return password;}

  function get_users(callback){
    var users = [];
    store.getCollection("user").data.forEach(function(user) {
      users.push(user.username);});
    return callback(null,users);}  

  function get_user(params, callback){
    var data;
    try {
      if (params.hasOwnProperty("id")){
        data = store.getCollection("user").get(params.id);}
      else{
        data = store.getCollection("user").by("key",params.username);}}
    catch (error) {
      return callback(null, null);}
    
    if (!data) {
      return callback(null, false, {message:options.lang.unknown_user, username:params.username});}
    else {
      var user = {id:data.$loki, username:data.username};
      if(params.token) { 
        user.token = params.token; user.password = null;
        if( !data.token || (data.token !== user.token)){
          update_data(store.getCollection("user"), user.username, user, function(err, msg){
            if(!err){
              return callback(null, user); }
            else{
              return callback(null, false, {message:msg, username: user.username});}})}
        else {
          return callback(null, user);}}
      else {
        if(data.password === get_md5_password("empty")){
          user.dirty_password = true;}
        if (params.password !== null){
          if (data.password != get_md5_password(params.password)) {
            return callback(null, false, {message: options.lang.wrong_password, username: user.username});}
          else {
            return callback(null, user);}}
        else {
          return callback(null, user);}}}}

  function update_data(collection, key, values, callback){
    var data = collection.by("key",key);
    if (!data) {
      var _data = {"key":key, doc:{}};
      data = collection.insert(_data);}
    for (var fieldname in values) {
      switch (fieldname) {
        case "password":
          if (!values.hasOwnProperty(fieldname) || values[fieldname] === "" 
            || values[fieldname] === null){
            values[fieldname] = "empty";}
            data[fieldname] = get_md5_password(values[fieldname]);
          break;
        default:
          if (!values.hasOwnProperty(fieldname) || values[fieldname] === null){
            values[fieldname] = "";}
          data[fieldname] = values[fieldname];
          break;}}
    store.saveDatabase(function(err){
      if(err) {
        if(callback){
          return callback(null, options.lang.update_error);}}
      else {
        if(callback){
          return callback(null, options.lang.update_ok);}}});}

  function get_dbs_doc(values){
    var vdata = {connect:{}, settings:{}};
    for (var fieldname in values) {
      switch (fieldname) {
        case "ndi_enabled":
        case "db_ssl":
          if(values[fieldname] !== "true"){
            vdata.settings[fieldname] = false;}
          else{
            vdata.settings[fieldname] = true;}
          break;
        case "encrypt_password":
          vdata.settings[fieldname] = values[fieldname];
          break;
        case "dbs_host_restriction":
          vdata.settings[fieldname] = values[fieldname];
          break;
        case "port":
          if(values[fieldname].toString().length === 0){
            vdata.connect[fieldname] = "";}
          else if(values[fieldname].toString()[0] === "$"){
            vdata.connect[fieldname] = values[fieldname].trim();}
          else {
            vdata.connect[fieldname] = parseInt(values[fieldname],10);
            if (isNaN(vdata.connect[fieldname])){
              vdata.connect[fieldname] = 0;}}
          break;
        case "host":
        case "dbname":
        case "username":
        case "password":
          vdata.connect[fieldname] = values[fieldname].trim();
          break;
        default:
          vdata[fieldname] = values[fieldname];
          break;}}
    vdata.connect = out.cryptedValue(values.alias, JSON.stringify(vdata.connect), "hex");
    vdata.time_stamp = new Date().toISOString();
    return vdata;}

  function delete_data(collection, key, callback){
    var data = collection.by("key",key);
    if (!data) {
      if (collection.name === "user"){
        return callback(null,options.lang.unknown_user);}
      else {
        return callback(null, null);}}
    else {
      if (collection.name === "user" && collection.data.length === 1){
        return callback(null, options.lang.user_delete_err);}
      else {
        collection.remove(data);
        store.saveDatabase(function(err){
          if(err) {
            return callback(null, options.lang.update_error);}
          else {
            return callback(null, options.lang.data_deleted);}});}}}
                
  function change_password(username, old_passw, new_passw, ver_passw, callback){
    var data = store.getCollection("user").by("key",username);
    if (!data) {
      return callback(null, options.lang.unknown_user);}
    else {
      if (data.password != get_md5_password(old_passw)) {
        return callback(null, options.lang.wrong_password);}
      else if (new_passw === null || new_passw === "") {
        return callback(null, options.lang.empty_password);}
      else if (new_passw !== ver_passw) {
        return callback(null, options.lang.verify_password);}
      else {
        data.password = get_md5_password(new_passw);
        store.saveDatabase(function(err){
          if(err) {
            return callback(null, options.lang.update_error);}
          else {
            return callback(null, options.lang.changed_password);}});}}}
    
  var result =  {
    getDataStore: function(){
      return store;},
    getUsers: function(callback){
      return get_users(callback);},
    getSettings: function(callback){
      return callback(null, get_groups("setting"));},
    getDatabases: function(callback){
      return callback(null, get_groups("dbs"));},  
    
    newUser: function(values, callback){
      if (!values.hasOwnProperty("username") || values.username === "" 
        || values.username === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data(store.getCollection("user"), values.username, values, callback);}},
    changePassword: function(username, old_passw, new_passw, ver_passw, callback){
      return change_password(username, old_passw, new_passw, ver_passw, callback);},
    updateDatabase: function(values, callback){
      if (!values.hasOwnProperty("alias") || values.alias === "" || values.alias === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data(store.getCollection("dbs"), values.alias, get_dbs_doc(values), callback);}},
    updateSetting: function(values, callback){
      if (!values.hasOwnProperty("fieldname") || values.fieldname === "" 
        || values.fieldname === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data(store.getCollection("setting"), values.fieldname, values, callback);}},
            
    deleteUser: function(username, callback){
      return delete_data(store.getCollection("user"), username, callback);},
    deleteSetting: function(fieldname, callback){
      return delete_data(store.getCollection("setting"), fieldname, callback);},
    deleteDatabase: function(alias, callback){
      return delete_data(store.getCollection("dbs"), alias, callback);},
    
    getUserFromName: function(username, password, callback){
      get_user({username: username, password: password}, callback);},
    getUserFromId: function(id, callback){
      get_user({id: id, password: null}, callback);},
    getUserFromEmail: function(email, profile, token, callback){
      get_user({username: email, password: null, 
        profile: profile, token: token}, callback);},
    getSettingFromFieldname: function(fieldname, callback){
      return callback(null, store.getCollection("setting").by("key",fieldname));},
    getDbsFromAlias: function(alias, callback){
      var _data = store.getCollection("dbs").by("key",alias);
      if (!_data || !alias) {
        return callback("missing",null);}
      else {
        var data = JSON.parse(JSON.stringify(_data));
        data.connect = JSON.parse(out.decipherValue(alias, data.connect, "hex"));
        return callback(null, data);}}}

    store.loadDatabase({}, function (err) {
      if (store.collections.length === 0){
        var index;
        if (!store.getCollection("dbs")){
          var dbs = store.addCollection("dbs",{unique:"key"});
          for (const alias in options.databases) {
            dbs.insert({key:alias, 
              alias:alias, engine: options.databases[alias].engine,
              connect:out.cryptedValue(alias, JSON.stringify( options.databases[alias].connect), "hex"), 
              settings: options.databases[alias].settings, time_stamp:new Date().toISOString()});}}
        if (!store.getCollection("user")){
          var user = store.addCollection("user",{unique:"key"});
          for (index = 0; index < options.conf.users.length; index++) {
            user.insert({key:options.conf.users[index].username, username:options.conf.users[index].username,
              password:get_md5_password("empty")});}}
        if (!store.getCollection("setting")){
          var setting = store.addCollection("setting",{unique:"key"});
          for (index = 0; index < options.conf.settings.length; index++) {
            setting.insert({key:options.conf.settings[index].fieldname, fieldname:options.conf.settings[index].fieldname,
              value:options.conf.settings[index].value, description:options.conf.settings[index].description});}}
        store.saveDatabase(function(save_err){
          if(options.callback){
            options.callback(save_err, result, to_object(get_groups("setting")));}});}
      else {
        if(options.callback){options.callback(err, result, to_object(get_groups("setting")));}}});
    return result;
}

function levelStore(options) {
  var PouchDB = require('pouchdb-node');
  var self = this;
  var store = new PouchDB(options.data_dir+'/storage/data');
  
  function get_md5_password(password){
    if (typeof password === "undefined" || password === "" || password === null) {
      password = "";}
    else {password = out.createHash(password,"hex");}
    return password;}

  function get_groups(gtype, callback){
    store.allDocs({include_docs: true, attachments: true, startkey: gtype, endkey: gtype+'\uffff'}, 
      function(err, data) {
        var rows = [];
        data.rows.forEach(function(row) {
          rows.push(row.doc);});
        callback(err,rows);});}

  function get_users(callback){
      get_groups("user",function(err, data){
        if (err) {return callback(err,null);}
        var users = [];
        data.forEach(function(user) {
          users.push(user.username);});
        return callback(err,users);});}

  function get_from_key(key, callback){
    store.get(key, function (err, data) {return callback(err, data);});}

  function get_user(params, callback){
    var key = "user_"+params.username;
    if (params.hasOwnProperty("id")){
      key = params.id;}
    store.get(key, function (err, data) {
      if (err) {
        if (err.status === 404) {
          return callback(null, false, {message:options.lang.unknown_user, username:params.username.split("_")[1]});}
        return callback(err);}
        var user = {id:data._id, username:data.username};
          if(params.token) {
            user.token = params.token; user.password = null;
            if( !data.token || (data.token !== user.token)){
              update_data("user_"+user.username, user, function(err, msg){
                if(!err){
                  return callback(null, user); }
                else{
                  return callback(null, false, {message:msg, username: user.username});}})}
            else {
              return callback(null, user);}}
          else {
            if(data.password === get_md5_password("empty")){
              user.dirty_password = true;}
            if (params.password !== null){
              if (data.password != get_md5_password(params.password)) {
                return callback(null, false, {message: options.lang.wrong_password, username: user.username});}
              else {
                return callback(null, user);}}
            else {
              return callback(null, user);}}});}

  function update_data(key, values, callback){
    store.get(key, function (err, data) {
      if (err) {
        if (err.status === 404) {
          data = {}; values._id = key;}}
      for (var fieldname in values) {
        switch (fieldname) {
          case "_csrf":
            break;
          case "password":
            if (!values.hasOwnProperty(fieldname) || values[fieldname] === "" 
              || values[fieldname] === null){
              values[fieldname] = "empty";}
              data[fieldname] = get_md5_password(values[fieldname]);
            break;
          default:
            if (!values.hasOwnProperty(fieldname) || values[fieldname] === null){
              values[fieldname] = "";}
            data[fieldname] = values[fieldname];
            break;}}
      store.put(data, function(err, response) {
        if (err) {return callback(err, null);}
        else if (response.ok && callback) {
          return callback(null, options.lang.update_ok);}
        else {
          if(callback){
            return callback(null, options.lang.update_error);}}});});}

  function get_dbs_doc(values){
    var vdata = {connect:{}, settings:{}};
    for (var fieldname in values) {
      switch (fieldname) {
        case "ndi_enabled":
          case "db_ssl":
          if(values[fieldname] !== "true"){
            vdata.settings[fieldname] = false;}
          else{
            vdata.settings[fieldname] = true;}
          break;
        case "encrypt_password":
          vdata.settings[fieldname] = values[fieldname];
          break;
        case "dbs_host_restriction":
          vdata.settings[fieldname] = values[fieldname];
          break;
        case "port":
          if(values[fieldname].toString().length === 0){
            vdata.connect[fieldname] = "";}
          else if(values[fieldname].toString()[0] === "$"){
            vdata.connect[fieldname] = values[fieldname].trim();}
          else {
            vdata.connect[fieldname] = parseInt(values[fieldname],10);
            if (isNaN(vdata.connect[fieldname])){
              vdata.connect[fieldname] = 0;}}
          break;
        case "host":
        case "dbname":
        case "username":
        case "password":
          vdata.connect[fieldname] = values[fieldname];
          break;
        default:
          vdata[fieldname] = values[fieldname];
          break;}}
    vdata.connect = out.cryptedValue(values.alias, JSON.stringify(vdata.connect), "hex");
    vdata.time_stamp = new Date().toISOString();
    return vdata;}
        
  function delete_user(username, callback){
    get_groups("user",function(err, data){
      if (err) {return callback(err,null);}
      if (data.length === 1){
        return callback(null, options.lang.user_delete_err);}
      var user = null;
      data.forEach(function(doc) {
        if (doc.username === username){
          user = doc;}});
      if (user !== null){
        store.remove(user._id, user._rev, function(err, response) {
          if (err) {return callback(err, err);}
          else if (response.ok) {
            return callback(null, options.lang.data_deleted);}
          else {
            return callback(null, options.lang.update_error);}});}
      else {
        return callback(null,options.lang.unknown_user);}});}

  function delete_data(key, callback){
    get_from_key(key,function(err, data){
      if (err) {
        if (err.status === 404) {
          return callback(null, null);}
        return callback(err, err);}
      store.remove(data._id, data._rev, function(err, response) {
        if (err) {return callback(err, err);}
        else if (response.ok) {
          return callback(null, options.lang.data_deleted);}
        else {
          return callback(null, options.lang.update_error);}});});}
                
  function change_password(username, old_passw, new_passw, ver_passw, callback){
    store.get(username, function (err, data) {
      if (err) {
        if (err.status === 404) {
          return callback(null, options.lang.unknown_user);}
        return callback(err, err);}
      if (data.password != get_md5_password(old_passw)) {
        return callback(null, options.lang.wrong_password);}
      else if (new_passw === null || new_passw === "") {
        return callback(null, options.lang.empty_password);}
      else if (new_passw !== ver_passw) {
        return callback(null, options.lang.verify_password);}
      else {
        data.password = get_md5_password(new_passw);
        store.put(data, function(err, response) {
          if (err) {return callback(err, err);}
          else if (response.ok) {
            return callback(null, options.lang.changed_password);}
          else {
            return callback(null, options.lang.update_error);}});}});}
      
  var result = {
    getDataStore: function(){
      return store;},
    getUsers: function(callback){
      return get_users(callback);},
    getSettings: function(callback){
      return get_groups("setting",callback);},
    getDatabases: function(callback){
      return get_groups("dbs",callback);},  
    
    newUser: function(values, callback){
      if (typeof values.username === "undefined" || values.username === "" 
        || values.username === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data("user_"+values.username, values, callback);}},
    changePassword: function(username, old_passw, new_passw, ver_passw, callback){
      return change_password("user_"+username, old_passw, new_passw, ver_passw, callback);},
    updateDatabase: function(values, callback){
      if (typeof values.alias === "undefined" || values.alias === "" || values.alias === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data("dbs_"+values.alias, get_dbs_doc(values), callback);}},
    updateSetting: function(values, callback){
      if (typeof values.fieldname === "undefined" || values.fieldname === "" 
        || values.fieldname === null){
        return callback(null, options.lang.invalid_fieldname);}
      else {
        return update_data("setting_"+values.fieldname, values, callback);}},
            
    deleteUser: function(username, callback){
      return delete_user(username, callback);},
    deleteSetting: function(fieldname, callback){
      return delete_data("setting_"+fieldname, callback);},
    deleteDatabase: function(alias, callback){
      return delete_data("dbs_"+alias, callback);},
    
    getUserFromName: function(username, password, callback){
      get_user({username: username, password: password}, callback);},
    getUserFromId: function(id, callback){
      get_user({id: id, password: null}, callback);},
    getUserFromEmail: function(email, profile, token, callback){
      get_user({username: email, password: null, 
        profile: profile, token: token}, callback);},
    getSettingFromFieldname: function(fieldname, callback){
      store.get("setting_"+fieldname, function (err, data) {
        if (err) {return callback(err,null);}
        else {return callback(err, data);}});},
    getDbsFromAlias: function(alias, callback){
      store.get("dbs_"+alias, function (err, data) {
        if (err) {return callback(err,null);}
        else {
          data.connect = JSON.parse(out.decipherValue(alias, data.connect, "hex"));
          return callback(err, data);}});}}

  store.info(function(err, info) {
    var settings={};
    if (!err) {
      if (info.doc_count === 0){
        var items = []; var index;
        for (const alias in options.databases) {
          items.push({_id:"dbs_"+alias, alias:alias, 
            engine: options.databases[alias].engine,
            connect: out.cryptedValue(alias, JSON.stringify(options.databases[alias].connect), "hex"), 
            settings:options.databases[alias].settings, 
            time_stamp:new Date().toISOString()});}
        for (index = 0; index < options.conf.users.length; index++) {
          items.push({_id:"user_"+options.conf.users[index].username, username:options.conf.users[index].username,
            password:get_md5_password("empty")});}
        for (index = 0; index < options.conf.settings.length; index++) {
          settings[options.conf.settings[index].fieldname] = options.conf.settings[index].value;
          items.push({_id:"setting_"+options.conf.settings[index].fieldname, fieldname:options.conf.settings[index].fieldname,
            value:options.conf.settings[index].value, description:options.conf.settings[index].description});}
        store.bulkDocs(items, function(berr, response){
          if(options.callback){options.callback(berr, result, settings);}});}
        else {
          get_groups("setting",function(serr,settings_arr){
            settings_arr.forEach(function(element) {
              settings[element.fieldname] = element.value;});
            if(options.callback){
              options.callback(serr, result, settings);}});}}
    else{
      if(options.callback){options.callback(err, result, {});}}});
  return result;
}           
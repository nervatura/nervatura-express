/*
This file is part of the Nervatura Framework
http://nervatura.com
Copyright © 2011-2021, Csaba Kappel
License: LGPLv3
https://raw.githubusercontent.com/nervatura/nervatura/master/LICENSE
*/

var path = require('path');
const fs = require('fs')
const execFile = require('child_process').execFile;

const servicePath = path.join("node_modules","nervatura","bin")
const serviceFile = (process.platform === "win32") ? "nervatura.exe" : "nervatura"

function checkJson(data){
  try { 
    const result = JSON.parse(data) 
    return result; 
  } catch (error) { 
    return data; 
  } 
}

function encodeOptions(data){
  return JSON.stringify(data)
}

function cliApi(_args, callback){
  const child = execFile(path.join(servicePath, serviceFile), _args, {env: process.env}, 
    (error, stdout, stderr) => {
    if (error) {
      return callback(stderr, null)
    }
    const result = checkJson(stdout.toString().split("\n")[stdout.toString().split("\n").length-2])
    if((typeof result === "object") && result.code){
      if(result.code != 200 && result.code != 204){
        return callback(result.message, null)
      }
    }
    callback(null, result)
  });
}

exports.DatabaseCreate = function(apiKey, options, callback) {
  cliApi(['-c', 'DatabaseCreate', '-o', encodeOptions(options), "-k", apiKey], function(err, data){
    callback(err, data)
  })
}

exports.UserLogin = function(options, callback) {
  cliApi(['-c', 'UserLogin', '-o', encodeOptions(options)], function(err, data){
    callback(err, data)
  })
}

exports.TokenLogin = function(token, callback) {
  cliApi(['-c', 'TokenLogin', '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.TokenRefresh = function(token, callback) {
  cliApi(['-c', 'TokenRefresh', '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.TokenDecode = function(token, callback) {
  cliApi(['-c', 'TokenDecode', '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.UserPassword = function(token, options, callback) {
  cliApi(['-c', 'UserPassword', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.Delete = function(token, options, callback) {
  cliApi(['-c', 'Delete', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.Get = function(token, options, callback) {
  cliApi(['-c', 'Get', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.View = function(token, data, callback) {
  cliApi(['-c', 'View', '-d', encodeOptions(data), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.Function = function(token, options, callback) {
  cliApi(['-c', 'Function', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.Update = function(token, options, callback) {
  cliApi(['-c', 'Update', '-nt', options.nervatype, '-d', encodeOptions(options.data), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.Report = function(token, options, callback) {
  cliApi(['-c', 'Report', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.ReportList = function(token, options, callback) {
  cliApi(['-c', 'ReportList', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.ReportDelete = function(token, options, callback) {
  cliApi(['-c', 'ReportDelete', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}

exports.ReportInstall = function(token, options, callback) {
  cliApi(['-c', 'ReportInstall', '-o', encodeOptions(options), '-t', token], function(err, data){
    callback(err, data)
  })
}
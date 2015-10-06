#!/usr/bin/env node

(function() {
http = require('http');
serve = require("./lib/server.js");
DriveFactory = require("./lib/driver.js");
QLFactory = require("./lib/QL.js");
RouterFactory = require("./lib/router.js")

try {
  Router = require('node-simple-router');
  Promise = require('es6-promises');
} catch (e) {
  console.log('Missing dependencies! You can install them with npm install.');
  process.exit(-1);
}

argv = process.argv.slice(2);

var QL = QLFactory(Promise, DriveFactory);
var configPromises = QL.loadConfig();

Promise.all(configPromises).then(function(configResults) {
  var qualifyPromises = QL.qualify();
  Promise.all(qualifyPromises).then(function(qualifyResults) {
    var cachePromises = QL.initCache();
    Promise.all(cachePromises).then(function(initResults) {
      var router = RouterFactory(QL, Router);

      console.log("Cache ready, launching server");
      serve(http, router);
    }).catch(function(err) {
      console.log(err.stack);
    });
  }).catch(function(err) {
    console.log(err.stack);
  });;
}).catch(function(err) {
  console.log(err.stack);
});

}).call(this);

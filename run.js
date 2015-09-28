#!/usr/bin/env node

(function() {
http = require('http');
drive = require("./lib/driver.js");
serve = require("./lib/server.js");
QLFactory = require("./lib/server.js");

try {
  Router = require('node-simple-router');
  Promise = require('es6-promises');
} catch (e) {
  console.log('Missing dependencies! You can install them with npm install.');
  process.exit(-1);
}

argv = process.argv.slice(2);

var QL = QLFactory(Promise, drive);

Promise.all(QL.loadconfig())
.then(function() {
  QL.init();
  QL.getKeys()
  .then(function(){
    Promise.all(QL.cacheTables).then(function() {
      var router = Router({
        list_dir: false
      });

      router.get("/:table", function(request, response) {
        QL.selectFrom(request.params.table).send()
        .then(function(rows) {

        }, function(err) {
          
        })
      });

      serve(router);
    })
  })
});

}).call(this);

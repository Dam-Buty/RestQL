#!/usr/bin/env node

(function() {
http = require('http');
serve = require("./lib/server.js");
DriveFactory = require("./lib/driver.js");
QLFactory = require("./lib/QL.js");
ConnectionFactory = require("./lib/connection.js");
RouterFactory = require("./lib/router.js")

try {
  Router = require('node-simple-router');
} catch (e) {
  console.log('Missing dependencies! You can install them with npm install.');
  process.exit(-1);
}

argv = process.argv.slice(2);

var QL = QLFactory(Promise, DriveFactory, ConnectionFactory);

Promise.all(QL.loadconfig())
.then(function() {
  Promise.all(QL.qualify()).then(function() {

  }, function(err) {

  });



  QL.loadConfig()
  .then(function(){
    Promise.all(QL.cacheTables).then(function() {
      var router = RouterFactory(QL);

      Router({
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
}, function(err) {

});

}).call(this);

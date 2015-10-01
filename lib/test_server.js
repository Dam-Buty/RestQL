http = require('http');
Router = require('node-simple-router');
RouterFactory = require("./router.js")
serve = require("./server.js");


var router = RouterFactory({}, Router);
serve(http, router);

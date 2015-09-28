#!/usr/bin/env node

(function() {
var Router, argv, http, router, server, clean_up;

try {
  Router = require('node-simple-router');
} catch (e) {
  console.log('node-simple-router must be installed for this to work');
  process.exit(-1);
}

http = require('http');

router = Router({
  list_dir: false
});

/*
Example routes
*/

router.get("/", function(request, response) {
    response.writeHead(200, {
      'Content-type': 'text/html'
    });
    response.write("<h1>Home</h1><hr/>");
    response.write('<div><a href="/hello">Hello Page</a></div>');
    response.write('<div><a href="/users">Users Page</a></div>');
    return response.end('<div><a href="/users/77">User 77 home page</a></div>');
});

router.get("/hello", function(request, response) {
  return response.end("Hello, World!, Hola, Mundo!");
});

router.get("/users", function(request, response) {
  response.writeHead(200, {
  'Content-type': 'text/html'
  });
  response.write("<h1 style='color: navy; text-align: center;'>Active members registry</h1><hr/>");
  response.write('<div><form action="/users" method="POST">');
  response.write('<label>User ID: </label>');
  response.write('<input type="number" name="user_id" /><input type="submit" value="Search" />');
  return response.end('</form></div>');
});

router.post("/users", function(request, response) {
  return response.end("User " + request.post.user_id + " requested. Trying to figure out who she is...");
});

router.any("/users/:id", function(request, response) {
  response.writeHead(200, {
    'Content-type': 'text/html'
  });
  return response.end("<h1>User No: <span style='color: red;'>" + request.params.id + "</span></h1>");
});

/*
End of example routes
*/


argv = process.argv.slice(2);

server = http.createServer(router);

server.on('listening', function() {
  var addr;
  addr = server.address() || {
    address: '0.0.0.0',
    port: argv[0] || 23666
  };
  return router.log("Serving web content at " + addr.address + ":" + addr.port + " - PID: " + process.pid);
});

clean_up = function() {
  router.log(" ");
  router.log("Server shutting up...");
  router.log(" ");
  server.close();
  return process.exit(0);
};

process.on('SIGINT', clean_up);
process.on('SIGHUP', clean_up);
process.on('SIGQUIT', clean_up);
process.on('SIGTERM', clean_up);

server.listen((argv[0] != null) && !isNaN(parseInt(argv[0])) ? parseInt(argv[0]) : 8000);

}).call(this);

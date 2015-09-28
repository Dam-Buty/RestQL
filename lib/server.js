
module.exports = function(router) {
  // create http server
  server = http.createServer(router);

  // start listening
  server.on('listening', function() {
    var addr;
    addr = server.address() || {
      address: '0.0.0.0',
      port: argv[0] || 23666
    };
    return router.log("Serving at " + addr.address + ":" + addr.port + " - PID: " + process.pid);
  });

  var clean_up = function() {
    router.log(" ");
    router.log("Server shutting up...");
    router.log(" ");
    server.close();
    return process.exit(0);
  };

  // We want the server to clean after itself even if it's shut down by a SIG from the kernel
  process.on('SIGINT', clean_up);
  process.on('SIGHUP', clean_up);
  process.on('SIGQUIT', clean_up);
  process.on('SIGTERM', clean_up);

  // Go go go
  server.listen((argv[0] != null) && !isNaN(parseInt(argv[0])) ? parseInt(argv[0]) : 23666);
}


module.exports = function(QL, Router) {
  var router = Router({
    list_dir: false
  });

  router.get("/test", function(request, response) {
    // QL.selectFrom(request.params.table).send()
    // .then(function(rows) {
    //   var body = JSON.stringify(rows);
    var body = "...";
    //JSON.stringify(request);
    console.log(request);

      response.writeHead(200, {
        'Content-Length': body.length,
        'Content-Type': 'text/plain'
      });
      response.write(body);
      // }, function(err) {
      //
      // })
  });

  return router;
}

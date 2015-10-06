
module.exports = function(QL, Router) {
  var router = Router({
    list_dir: false
  });

  router.get("/:table", function(request, response) {
    console.log("Received request for table <" + request.params.table + ">");
    QL.selectFrom(request.params.table).send()
    .then(function(results) {
      response.writeHead(200, {'Content-type': 'application/json'});
      response.write(JSON.stringify(results));
      reponse.end();
    }).catch(function(err) {
      console.log(err);
    })
  });

  return router;
}

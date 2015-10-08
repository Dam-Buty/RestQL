
module.exports = function(QL, Router) {
  var router = Router({
    list_dir: false
  });

  var respond = {
    200: function(request, response, results) {
      response.writeHead(200, {
        'Content-type': 'application/json charset=UTF-8'
      });

      if (results.length === 1) {
        results = results[0];
      }

      response.end(JSON.stringify(results));
    },

    500: function(request, response) {
      response.writeHead(500);
      response.end("There was an error when contacting the database. Please consult the logs.");
    },

    404: function(request, response) {
      response.writeHead(404);
      response.end("Element <b>" + request.params.id + "</b> could not be found in table <b>" + request.params.table + "</b>.");
    }
  };

  var filter = function(request, select) {
    var columns, orderBy;
    var obj = {};

    if (request.get.columns !== undefined) {
      select.columns(request.get.columns.split(","));
    }

    if(request.get.orderBy !== undefined) {
      orderBy = request.get.orderBy;

      orderBy.split(",").forEach(function(_column) {
        var column = _column.replace("_ASC", "").replace("_DESC", "");
        var direction = "ASC";

        if (_column.indexOf("_DESC") > -1) {
          direction = "DESC";
        }

        obj[column] = direction;
      });

      select.orderBy(obj);
    }

    return select;
  };

  router.get("/:table", function(request, response) {
    console.log("Received request for table <" + request.params.table + ">");
    var select = filter(request, response, QL.selectFrom(request.params.table));

    select.send().then(function(results) {
      respond(response, results);
    }).catch(function(err) {
      console.log("Bim badaboom");
      console.dir(Error(err));
      error(response);
    })
  });

  router.get("/:table/:id", function(request, response) {
    console.log("Received request for row <" + request.params.id + "> of table <" + request.params.table + ">");
    QL.selectFrom(request.params.table, request.params.id).send()
    .then(function(results) {
      respond(results, response);
    }).catch(function(err) {
      console.log(err);
    });
  });

  router.get("/:table/:column/:value", function(request, response) {
    console.log("Received request for table <" + request.params.table + "> where <" + request.params.column + "> = <" + request.params.value + ">");

    var filter = {};
    filter[request.params.column] = request.params.value;

    QL.selectFrom(request.params.table).where(filter).send()
    .then(function(results) {
      respond(results, response);
    }).catch(function(err) {
      console.log(err);
    });
  });

  return router;
}

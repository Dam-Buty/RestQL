
module.exports = function(QL, Router) {
  var router = Router({
    list_dir: false
  });

  var respond = {
    200: function(response, data) {
      response.writeHead(200, {
        'Content-type': 'application/json charset=UTF-8'
      });

      if (data.length === 1) {
        data = data[0];
      }

      response.end(JSON.stringify(data));
    },

    500: function(response, error) {
      response.writeHead(500);
      response.end("There was an error when contacting the database : " + error);
    },

    404: function(response, error) {
      response.writeHead(404);
      response.end(error);
      // response.end("Element <b>" + request.params.id + "</b> could not be found in table <b>" + request.params.table + "</b>.");
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

    if (QL.tables[request.params.table] !== undefined && QL.tables[request.params.table].length > 0) {
      var select = filter(request, QL.selectFrom(request.params.table));

      select.send().then(function(results) {
        respond[200](response, results);
      }).catch(function(err) {
        respond[500](response, err);
      });
    } else {
      respond[404](response, "Table <b>" + request.params.table + "</b> does not exist");
    }


  });

  router.get("/:table/:id", function(request, response) {
    console.log("Received request for row <" + request.params.id + "> of table <" + request.params.table + ">");

    if (QL.tables[request.params.table] !== undefined && QL.tables[request.params.table].length > 0) {
      var select = filter(request, QL.selectFrom(request.params.table, request.params.id));

      select.send().then(function(results) {
        if (results.length === 0) {
          respond[404](response, "Row <b>" + request.params.id + "</b> does not exist in table <b>" + request.params.table + "</b>.");
        } else {
          respond[200](response, results);
        }
      }).catch(function(err) {
        respond[500](response, err);
      });
    } else {
      respond[404](response, "Table " + request.params.table + " does not exist");
    }
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

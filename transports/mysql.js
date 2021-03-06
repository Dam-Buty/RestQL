mysql = require('mysql');

module.exports = function(Promise) {
  return {
    id: "mysql",

    connect: function(params) {
      var connection = mysql.createConnection({
        host     : params.host,
        user     : params.user,
        password : params.pass,
        database : params.base
      });

      var promise = new Promise(function(resolve, reject) {
        connection.connect(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(connection);    // The connect function MUST return a handler
          }
        });
      });

      return promise;
    },

    close: function(connection) {       // It will be retrieved with each function call
      var promise = new Promise(function(resolve, reject) {
        connection.end(function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      return promise;
    },

    getTables: function(connection) {
      var self = this;
      var tables = {};

      var promise = new Promise(function(resolve, reject) {
        connection.query("SHOW TABLES;", function(err, rows, fields) {
          if (err) {
            reject(err)
          } else {
            var field = fields[0].name;
            var tablesNumber = rows.length;

            rows.forEach(function(row) {
              var tableName = row[field];

              var table = {
                name: tableName,
                key: undefined
              };

              connection.query("SHOW KEYS FROM " + tableName + " WHERE Key_name = 'PRIMARY'", function(err, rows) {
                if (err) {
                  reject(err);
                } else {
                  table.key = rows[0].Column_name;
                  tables[tableName] = table;
                  if (Object.keys(tables).length == tablesNumber) {
                    resolve(tables);
                  }
                }
              });
            });
          }
        });
      });

      return promise;
    },

    select: function(connection, params) {
      var _select = [];
      var _from = [];
      var _where = [];
      var _orderBy = [];


      if (params.columns.length === 0) {
        _select.push("*");
      } else {
        _select.push(params.columns.map(function(column) { return "`" + column + "`"; }));
      }

      _from.push("`" + params.table + "`");

      if (params.id !== undefined) {
        _where.push("`" + params.idColumn + "` = '" + params.id + "'");
      }

      Object.keys(params.where).forEach(function(column) {
        _where.push("`" + column + "` = '" + params.where[column] + "'");
      });

      Object.keys(params.orderBy).forEach(function(column) {
        _orderBy.push("`" + column + "` " + params.orderBy[column]);
      });

      var query = "SELECT " + _select.join(", ") +
                  " FROM "  + _from.join(", ")   ;

      if (_where.length > 0) {
        query +=  " WHERE " + _where.join(", ")  ;
      }

      if (_orderBy.length > 0) {
        query +=  " ORDER BY " + _orderBy.join(", ")  ;
      }

      query += ";";

      console.log("Sending query : " + query);

      var promise = new Promise(function(resolve, reject) {
        connection.query(query, function(err, rows) {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });

      return promise;
    }
  }
};

/* CUSTOM.JSON format

"params": {
  "slow": 110,
  "persistent": false,
  "host": "localhost",
  "user": "test_ADMR",
  "pass": "secret",
  "base": "ADMR",
  "isAuthorityOn": ["categorie"]
}

*/

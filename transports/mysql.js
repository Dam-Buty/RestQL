mysql = require('mysql');
Promise = require('es6-promises');

module.exports = function() {
  return {
    id: "mysql",

    connect: function(params, callback) {
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
                  if (Object.keys(keys).length == tablesNumber) {
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

    select: function(connection, params, callback) {
      var _query = ["SELECT"];

      if (params.columns === "*") {
        _query.push("*");
      } else {
        _query.push(params.columns.map(function(column) { return "`" + column + "`"; }).join(", "));
      }

      _query.push("FROM `" + params.table + "`");

      if (params.id !== undefined) {
        _query.push("WHERE `" + params.idColumn + "` = '" + params.id + "'");
      }

      var query = _query.join(" ") + ";";

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

var mysql = require('mysql');

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

    close: function(connection, callback) {       // It will be retrieved with each function call
      connection.end();
      callback();
    },

    getKeys: function(connection, callback) {
      var self = this;
      var keys = {};

      connection.query("SHOW TABLES;", function(err, rows, fields) {
        if (err) {
          callback("", err)
        } else {
          var field = fields[0].name;
          var tablesNumber = rows.length;

          rows.forEach(function(row) {
            var table = row[field];

            connection.query("SHOW KEYS FROM " + table + " WHERE Key_name = 'PRIMARY'", function(err, rows) {
              if (err) {
                callback("", err);
              } else {
                var key = rows[0].Column_name;
                keys[table] = key;
                if (Object.keys(keys).length == tablesNumber) {
                  callback(keys);
                }
              }
            });
          });
        }
      });
    },

    select: function(connection, params, callback) {
      var _query = ["SELECT"];

      if (params.columns === "*") {
        _query.push("*");
      } else {
        _query.push(params.columns.map(function(column) { return "`" + column + "`"; }).join(", "));
      }

      _query.push("FROM `" + params.table + "`");

      var query = _query.join(" ") + ";";

      console.log("Sending query : " + query);

      connection.query(query, function(err, rows) {
        if (err) {
          callback("", err);
        } else {
          callback(rows);
        }
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

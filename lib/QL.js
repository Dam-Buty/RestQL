
module.exports = function(Promise, drive) {
  var QL = {
    drivers: {},
    cache: {},
    tables: {},
    promises: [],
    fastest: undefined,
    broadcasts: {},

    loadConfig: function() {
      var self = this;
      var promises = [];

      // custom.json lists the required transports, connections and bases
      var custom = require("./custom.json");

      Object.keys(custom.cache).forEach(function(tableName) {
        this.cache[table] = { "__type": custom.cache[tableName], "__status": "empty" };
      });

      // Loop on the transports to initialize them
      Object.keys(custom.transports).forEach(function(_transport) {
        var connections = custom.transports[_transport];

        var path = "./transports/" + _transport + ".js";

        var TransportFactory = require(path);
        var transport = TransportFactory();

        // Loop on the connections and drive them
        connections.forEach(function(params) {
          id = customConnection.id;

          var driver = drive(Promise, transport, params);

          promises.push(
            driver.promise.then(function(handler) {
              self.drivers[params.id] = driver;
              console.log("...");
            }, function(err) {
              console.log(err);
            });
          );
        });
      });

      return promises;
    },

    qualify: function() {
      console.log("Configuration terminée. Pool de connections actives :")
      console.log(Object.keys(drivers).length);

      var self = this;
      var promises = [];

      // Loop on the drivers
      Object.keys(drivers).forEach(function(key) {
        var driver = drivers[key];

        // Get the fastest connection in line for SELECT requests
        if (fastest === undefined) {
          fastest = driver;
        } else {
          if (driver.fast < fastest.fast) {
            fastest = driver;
          }
        }

        // Get the broadcasts
        Object.keys(driver.broadcasts).forEach(function(authKey) {
          broadcasts[authKey] = driver;
        });

        promises.push(driver.getTables().then(function() {
          self.tables[driver.params.id] = driver.tables;
        }));
      });

      return promises;
    },

    initCache: function() {
      var self = this;
      var promises = [];

      Object.keys(this.cache).forEach(function(tableName) {
        var type = self.cache[tableName]["__type"];

        if (type === "complete") {
          promises.push(
            self.selectFrom(tableName).send();
          );
        }
      });

      return promises;
    },

    _selectNoCache: function(obj) {
      var self = this;

      if (this.broadcasts[obj.params.table] !== undefined) {
        obj.source = this.broadcasts[obj.params.table];
      } else {
        obj.source = this.fastest;
      }

      if (source.params.translation[obj.params.table] !== undefined) {
        obj.params.table = source.params.translation[table];
      }

      obj.params["idColumn"] = source.tables[obj.params.table].key;

      return obj.source.select(obj.params).then(function(results) {
        if (self.cache[obj.params.table] !== undefined) {
          results.forEach(function(result) {
            var id = result[obj.params["idColumn"]];
            self.cache[obj.params.table][id] = result;
            self.cache[obj.params.table]["__status"] = "complete";
          });
        }
      });
    },

    _selectFromCache: function(obj) {
      var resolved = [];

      if (obj.params.id === undefined) {
        if (this.cache[obj.params.table]["__status"] === "complete") {
          var rows = this.cache[obj.params.table];

          Object.keys(rows).forEach(function(id) {
            var row = rows[id];
            var included = true;

            if (["__status", "__type"].indexOf(id) > -1) {
              if (Object.keys(obj.params.filter).length > 0) {
                Object.keys(obj.params.filter).every(function(filter) {
                  var value = obj.params.filter[filter];
                  if (row[filter] != value) {
                    included = false;
                    return false;
                  }

                  return true;
                });
              }

              if (included) {
                var finalRow = {};
                if (obj.params.columns.length > 0) {
                  Object.keys(obj.params.columns).forEach(function(column) {
                    finalRow[column] = row[column];
                  });
                } else {
                  finalRow = row;
                }
                resolved.push(finalRow);
              }
            }

          });

        }
      } else {
        if (this.cache[obj.params.table][obj.params.id] !== undefined) {
          resolved.push(this.cache[obj.params.table][obj.params.id]);
        }
      }

      if (resolved.length === 0) {
        promise = this._selectNoCache(obj);
      } else {
        promise = new Promise(function(resolve, reject) {
          resolve(resolved);
        });
      }

      return promise;
    };

    _select: function(obj) {
      var source, promise;
      var self = this;

      if (this.cache[obj.params.table] === undefined) {
        promise = this._selectNoCache(obj);
      } else {
        promise = this._selectFromCache(obj);
      }

      return promise;
    },

    selectFrom: function(table, id) {
      var self = this;

      return {
        source: undefined,
        params: {
          table: table,
          id: id,
          columns: [],
          filter: {},
          order: {}
        },

        columns: function(columns) {
          this.params.columns.push(columns);
          return this;
        },

        filter: function(filter) {
          this.params.filter = filter;
          return this;
        },

        order: function(order) {
          this.params.order = order;
          return this;
        },

        send: function() {
          return self._select(this);
        }
      };
    }
  };

  return QL;
}

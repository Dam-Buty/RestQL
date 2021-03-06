
module.exports = function(Promise, drive) {
  var QL = {
    drivers: {},
    cache: {},
    tables: {},
    promises: [],
    broadcasts: {},
    externals: {},

    loadConfig: function() {
      var self = this;
      var promises = [];

      // custom.json lists the required transports, connections and bases
      var custom = require("../custom.json");

      Object.keys(custom.cache).forEach(function(tableName) {
        self.cache[tableName] = { "__type": custom.cache[tableName], "__status": "empty" };
      });

      // Loop on the transports to initialize them
      Object.keys(custom.transports).forEach(function(_transport) {
        var connections = custom.transports[_transport];

        var path = "../transports/" + _transport + ".js";

        var TransportFactory = require(path);
        var transport = TransportFactory(Promise);

        // Loop on the connections and drive them
        connections.forEach(function(params) {
          id = params.id;

          var driver = drive(Promise, transport, params);

          console.log("Testing connection");

          promises.push(
            driver.connect().then(function(handler) {
              self.drivers[params.id] = driver;
              console.log("Connection OK, closing");
              driver.close();
            })
          );
        });
      });

      return promises;
    },

    qualify: function() {
      console.log("Configuration terminée. Pool de connections actives :")
      console.log("++ < " + Object.keys(this.drivers).length + " > ++");

      var self = this;
      var promises = [];

      // Loop on the drivers
      Object.keys(this.drivers).forEach(function(_driver) {
        var driver = self.drivers[_driver];

        // Get the broadcasts
        if (driver.broadcasts !== undefined) {
          driver.broadcasts.forEach(function(table) {
            self.broadcasts[table] = driver;
          });
        }

        promises.push(
          driver.getTables().then(function(tables) {
            tables.forEach(function(table) {
              if (self.tables[table] === undefined) {
                self.tables[table] = [];
              }
              self.tables[table].push(driver);

              if (driver.external !== undefined && driver.external) {
                if (self.externals[table] === undefined) {
                  self.externals[table] = [];
                }
                self.externals[table].push(driver);
              }
            });
          })
        );
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
            self.selectFrom(tableName).send()
          );
        }
      });

      return promises;
    },

    _getFastestFor: function(table) {
      var fastest;

      this.tables[table].forEach(function(driver) {
        if (fastest === undefined || driver.params.slow < fastest.params.slow) {
          fastest = driver;
        }
      });

      return fastest;
    },

    _selectNoCache: function(obj) {
      var self = this;

      if (this.broadcasts[obj.params.table] !== undefined) {
        obj.source = this.broadcasts[obj.params.table];
        console.log("Base <" + obj.source.params.id + "> selected for being broadcaster");
      } else {
        obj.source = this._getFastestFor(obj.params.table);
        console.log("Base <" + obj.source.params.id + "> selected for being fastest");
      }

      return obj.source.select(obj.params);
    },

    /*
    ** Here we try to resolve a query entirely from the cache
    ** If we fail, we return a promise to get it from a db source
    ** If we succeed we return an immediately resolved promise with the results
    */
    _selectFromCache: function(obj) {
      var resolved = [];
      var self = this;

      // no id means we select the whole table
      if (obj.params.id === undefined) {
        // we only select
        if (this.cache[obj.params.table]["__status"] === "complete") {
          if (this.cache[obj.params.table]["__empty"] === undefined) {
            // we get the whole cached table
            var rows = this.cache[obj.params.table];

            Object.keys(rows).forEach(function(id) {
              var row = rows[id];
              var included = true;

              // filter out artefacts
              if (["__status", "__type"].indexOf(id) === -1) {
                if (Object.keys(obj.params.where).length > 0) {
                  // Apply filters to determine if row must be included
                  Object.keys(obj.params.where).every(function(column) {
                    var value = obj.params.where[column];
                    if (row[column] != value) {
                      included = false;
                      return false;
                    }

                    return true;
                  });
                }

                if (included) {
                  var finalRow = {};

                  // Filter only the selected columns
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

            if (Object.keys(obj.params.orderBy).length > 0) {
              // sort the output
              resolved.sort(function(a, b) {
                var score = 0;

                Object.keys(obj.params.orderBy).every(function(column) {
                  var direction = obj.params.orderBy[column];

                  // it's a naive sort using implicit comparisons
                  // potentially messy but i'll get into types later on
                  if (a[column] < b[column]) {
                    score = -1;
                  }

                  if (a[column] > b[column]) {
                    score = 1;
                  }

                  if (direction !== "ASC") {
                    score *= -1;
                  }

                  return (score === 0); // every will loop on the columns until a non 0 score is found
                });
              });
            }
          } else {
            resolved.push("__empty");
          }
        }
      } else {
        // if the table is know to be empty send empty
        if (this.cache[obj.params.table]["__empty"]) {
          resolved.push("__empty");
        } else {
          if (this.cache[obj.params.table][obj.params.id] === undefined) {
            // if the row is not found on a known complete table, no need to try the db
            if (this.cache[obj.params.table]["__status"] === "complete") {
              resolved.push("__empty");
            }
          } else {
            // if the row is "known empty" send empty
            if (this.cache[obj.params.table][obj.params.id] === "") {
              resolved.push("__empty");
            } else {
              resolved.push(this.cache[obj.params.table][obj.params.id]);
            }
          }
        }
      }

      if (resolved.length === 0) {
        console.log("Data is not cached yet, grabbing from database after all");
        promise = this._selectNoCache(obj).then(function(results) {
          // we have gotten db results on a cached table, so we feed the
          // results back into the cache
          self._insertIntoCache(obj, results);
          return results;
        });
      } else {
        if (resolved[0] === "__empty") {
          console.log("Empty result from the cache");
          promise = Promise.resolve([]);
        } else {
          console.log("Successfully selected data from memory");
          promise = Promise.resolve(resolved);
        }
      }

      return promise;
    },

    _select: function(obj) {
      var source, promise;
      var cached = true;
      var self = this;

      // if this is an uncached table we go directly to the db
      if (this.cache[obj.params.table] === undefined) {
        console.log("Table is not cached, grabbing from database");
        promise = this._selectNoCache(obj);
      } else {
        // or we try to resolve from cache
        console.log("Table is cached, trying to resolve from cache")
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
          where: {},
          orderBy: {}
        },

        columns: function(columns) {
          this.params.columns = this.params.columns.concat(columns);
          return this;
        },

        where: function(filters) {
          var _self = this;
          Object.keys(filters).forEach(function(column) {
            _self.params.where[column] = filters[column];
          });
          return this;
        },

        orderBy: function(order) {
          this.params.orderBy = order;
          return this;
        },

        send: function() {
          return self._select(this);
        }
      };
    },

    _insertIntoCache: function(obj, results) {
      var self = this;
      var tableName = obj.params.table;
      var driverTable = obj.source.getTranslation(tableName);
      var idColumn = obj.source.tables[driverTable].key;

      if (results.length > 0) {
        console.log("Data grabbed from database. Caching in memory");
      }

      results.forEach(function(row) {
        var id = row[idColumn];

        // If the row doesn't exist at all in the cache
        // or if we have grabbed the whole row, then we want to update the whole row in a go
        if (self.cache[tableName][id] === undefined || obj.params.columns.length === 0) {
          self.cache[tableName][id] = row;
        } else {
          // otherwise we just update the rows we've got
          Object.keys(row).forEach(function(column) {
            var val = row[column];
            self.cache[tableName][id][column] = val;
          });
        }
      });

      // a row is reputed empty only after an unfiltered select to its id
      if (obj.params.id !== undefined && Object.keys(obj.params.where).length === 0) {
        if (results.length === 0) {
          self.cache[tableName][obj.params.id] = "";
        }
      }

      // the table is reputed complete or empty only after an unfiltered select
      if (obj.params.id === undefined && obj.params.columns.length === 0 && Object.keys(obj.params.where).length === 0) {
        if (results.length === 0) {
          self.cache[tableName]["__empty"] = true;
        }
        self.cache[tableName]["__status"] = "complete";
      }
    },

    insertInto: function(table) {
    }
  };



  return QL;
}

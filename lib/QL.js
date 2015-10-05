
module.exports = function(Promise, drive) {
  var QL = {
    drivers: {},
    cache: {},
    keys: {},
    promises: [],
    fastest: undefined,
    broadcasts: {},

    loadConfig: function() {
      var promises = [];

      // custom.json lists the required transports, connections and bases
      var custom = require("./custom.json");

      custom.cached.forEach(function(table) {
        this.cache[table] = {};
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
            driver.promise
            .then(function(handler) {
              drivers[params.id] = driver;
              console.log("...");
            }, function(err) {
              console.log(err);
            });
          );
        });
      });

      return promises;
    },

    init: function() {
      console.log("Configuration terminée. Pool de connections actives :")
      console.log(Object.keys(drivers).length);

      var self = this;

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

        self.tables[driver.params.id] = driver.getTables();
      });
    },

    getKeys: function() {
      var self = this;

      return this.fastest.getKeys().then(function(keys) {
        self.keys = keys;
        console.log("The following keys were automatically retrieved from the database :")
        console.dir(keys);
      }, function(err) {
        console.log("There was an error retrieving the keys :");
        console.log(err);
      });
    },

    cacheTables: function() {
      var self = this;
      var promises = [];

      // Caching from authority, or from fastest
      Object.keys(this.cache).forEach(function(table) {
        var source;
        var key = self.keys[table];

        if (self.authorities[table] !== undefined) {
          source = self.authorities[table];
        } else {
          source = self.fastest;
        }

        promises.push(
          source.select().end()
          .then(function(results) {
            // reindex the results by primary key
            results.forEach(function(result) {
              self.cache[table][result[key]] = result;
            });
            console.log("Table " + table + " mise en cache :");
            console.dir(self.cache[table]);
          }, function(err) {
            console.log
          })
        );
      });

      return promises;
    },

    _select: function(obj) {
      return obj.source.select(obj.params);
    },

    selectFrom: function(table) {
      var source;
      var self = this;

      if (this.authorities[table] !== undefined) {
        source = this.authorities[table];
      } else {
        source = this.fastest;
      }

      return {
        source: source,
        params: {
          table: table,
          columns: "*",
          filter: {},
          order: {}
        },

        columns: function(columns) {
          this.params.columns = columns;
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

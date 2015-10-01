
module.exports = function(Promise, drive) {
  var QL = {
    drivers: {},
    cache: {},
    keys: {},
    promises: [],
    fastest: undefined,
    authorities: {},

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

        var driver = drive(Promise, transport, ConnectionFactory);
        drivers[_transport] = driver;

        // Loop on the connections and initialize them
        connections.forEach(function(customConnection) {
          id = customConnection.id;
          promises.push(
            driver.registerConnection(customConnection)
            .then(function(connection) {
              console.log("...");
            }, function(err) {
              console.log(err);
            })
          );
        });
      });

      return promises;
    },

    init: function() {
      console.log("Configuration terminée. Pool de connections actives :")

      Object.keys(drivers).forEach(function(key) {
        var driver = drivers[key];

        // Get the fastest connection in line for SELECT requests
        if (fastest === undefined) {
          fastest = driver;
        } else {
          if (driver.fastest < fastest.fastest) {
            fastest = driver;
          }
        }

        // Get the connections who are authorities on certain tables
        Object.keys(driver.authorities).forEach(function(authKey) {
          authorities[authKey] = driver;
        });

        // List connections to the console
        console.log(" - " + driver.transport.id + " :");
        Object.keys(driver.connections).forEach(function(cxKey) {
          var connection = driver.connections[cxKey];
          console.log(" + - " + connection.id);
        });
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

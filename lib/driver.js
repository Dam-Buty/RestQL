module.exports = function(Promise, transport, params) {
  var driver = {
    transport: transport,
    params: params,
    tables: {},
    status: "idle",
    handler: undefined,
    promise: undefined,

    connect: function() {
      var self = this;

      if (this.status === "idle") {
        console.log("Opening connection");
        return this.transport.connect(this.params).then(function(handler) {
          self.handler = handler;
          self.status = "connected";
          return handler;
        });
      } else {
        return Promise.resolve(self.handler);
      }
    },

    close: function() {
      if (!this.params.persistent) {
        console.log("Closing non persistent connection");
        this.transport.close(this.handler);
        this.handler = undefined;
        this.status = "idle";
      }
    },

    getTables: function() {
      var self = this;

      return this.connect().then(function(handler) {
        return transport.getTables(handler).then(function(tables) {
          // The tables are stored in the driver with their database name
          // in QL they are referenced by their translated name
          // and will not be needing their keys so the next thens
          // only get an array of table names
          self.tables = tables;
          var QLTables = [];

          Object.keys(tables).forEach(function(table) {
            var translated = false;

            if (self.params.translation !== undefined) {
              Object.keys(self.params.translation).forEach(function(newName) {
                var oldName = self.params.translation[newName];

                if (table === oldName) {
                  QLTables.push(newName);
                }
              });
            }

            if (!translated) {
              QLTables.push(table);
            }
          });

          return QLTables;
        }).then(function(tables) {
          self.close();
          return tables;
        });
      });
    },

    getTranslation: function(table) {
      if (this.params.translation !== undefined && this.params.translation[table] !== undefined) {
        return this.params.translation[table];
      } else {
        return table;
      }
    },

    select: function(_params) {
      var self = this;

      // we clone the params to not alter the original object which may be used elsewhere
      var params = JSON.parse(JSON.stringify(_params));

      params.table = this.getTranslation(params.table);

      params["idColumn"] = this.tables[params.table].key;

      return this.connect().then(function(handler) {
        return transport.select(handler, params).then(function(results) {
          self.close();
          return results;
        });
      });
    }
  };

  return driver;
};

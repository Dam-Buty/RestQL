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
          console.log("GOT TABLE");
          console.dir(tables);
          self.tables = tables;
          return tables;
        }).then(function(tables) {
          self.close();
          return tables;
        });
      });
    },

    select: function(params) {
      var self = this;

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

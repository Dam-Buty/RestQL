module.exports = function(Promise, transport, _connection) {
  return {
    id: _connection.id,
    status: "idle",
    params: _connection.params,
    handler: undefined,

    connect: function() {
      var self = this;
      var promise;

      promise = new Promise(function(resolve, reject) {
        var connection;

        if (self.status === "idle") {
          connection = transport.connect(self.params, function(handler, err) {
            if (err) {
              reject(Error(err));
            } else {
              self.handler = handler;
              self.status = "connected";
              resolve();
            }
          });
        } else {
          resolve()
        }
      });

      return promise;
    },

    close: function() {
      var self = this;

      var promise = new Promise(function(resolve, reject) {
        transport.close(self.handler, function(err) {
          if (err) {
            reject(Error(err));
          } else {
            self.handler = undefined;
            self.status = "idle";
            resolve();
          }
        });
      });

      return promise;
    },

    getKeys: function() {
      var self = this;
      var keys;
      var promise;

      promise = new Promise(function(resolve, reject) {
        keys = transport.getKeys(self.handler, function(keys, err) {
          if (err) {
            reject(Error(err));
          } else {
            resolve(keys);
          }
        });
      });

      return promise;
    },

    select: function(params) {
      var self = this;

      var promise = new Promise(function(resolve, reject) {
        self.connect().then(function() {
          transport.select(self.handler, params, function(rows, err) {
            if (!self.params.persistent) {
              self.close();
            }

            if (err) {
              reject(Error(err));
            } else {
              resolve(rows);
            }
          });
        });
      });

      return promise;
    }
  };
};

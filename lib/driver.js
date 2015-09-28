ConnectionFactory = require("./connection.js");

module.exports = function(Promise, transport) {
  return {
    transport: transport,
    connections: {},
    authorities: {},
    fastest: undefined,

    registerConnection: function(_connection) {
      var self = this;
      var connection = ConnectionFactory(Promise, transport, _connection);

      return connection.connect()
      .then(function() {
        self.connections[connection.id] = connection;
        if (self.fastest === undefined) {
          self.fastest = connection;
        } else {
            if (connection.params.slow < self.fastest.slow) {
              self.fastest = connection;
            }
        }

        if (connection.params.isAuthorityOn !== undefined) {
          console.info("Connection " + connection.id + " est l'autorité sur la/les table(s) " + connection.params.isAuthorityOn.join(", ") + ".");
          connection.params.isAuthorityOn.forEach(function(table) {
            self.authorities[table] = connection;
          });
        }

        console.info("Connection " + connection.id + " réussie. Ajout au pool.");
        console.info("Pool : " + Object.keys(self.connections).length + " bases live.");

        if (!connection.params.persistent) {
          connection.close().then(function() { console.info("Connexion non persistente, fermée pour l'instant.") });
        }
      }, function(err) {
        console.error("Connexion échouée : ");
        console.dir(connection.params);
        console.error(err);
      });
    },

    getKeys: function() {
      return this.fastest.getKeys();
    },

    select: function(params) {
      var source;

      if (this.authorities[table] !== undefined) {
        source = this.authorities[table];
      } else {
        source = this.fastest;
      }

      return source.select(this.params);
    }
  };
};

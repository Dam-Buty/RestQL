module.exports = function(Promise, transport, params) {
  var driver = {
    transport: transport,
    params: params,
    tables: {},
    status: "idle",
    handler: undefined,
    promise: undefined,

    getTables: function() {
      return transport.getTables().then(function(tables) {
        this.tables = tables;
      }, function(err) {
        console.log(err);
      });
    },

    select: function(params) {
      return transport.select(params);
    }
  };

  driver.promise = transport.connect().then(function(handler) {
    driver.handler = handler;

    if (!params.persistent) {
      transport.close().then(function() { console.info("Connexion non persistente, fermée pour l'instant.") });
    }
  }, function(err) {
    console.error("Connexion échouée : ");
    console.dir(params);
    console.error(err);
  });

  return driver;
};

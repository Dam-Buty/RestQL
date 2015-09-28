// Changes a function from the "callback + err" paradigm
// to a promises paradigm.
module.exports = function(fn) {
  var promise = new Promise(function(resolve, reject) {
    fn()(function(err) {
      if (err) {
        reject(Error(err));
      } else {
        resolve();
      }
    });
  });

  return promise;
};

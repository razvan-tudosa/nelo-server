exports.index = function(req, res) {
  res.send(200, {
    hello: 'This is my API!'
  });
};

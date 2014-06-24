var mongoose = require('mongoose');

exports.getHotel = function(req, res) {
  mongoose.model('Hotel').find({}, function (err, items) {
    if (err) {
      res.send(500, {
        message: err
      });
    }
    res.send(200, items);
  });
}
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var HotelSchema = new Schema({
  address: String,
  coordinates: {},
  owner: {}
}, { collection: 'hotel' });

mongoose.model('Hotel', HotelSchema);

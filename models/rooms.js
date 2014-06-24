var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RoomSchema = new Schema({
  //_id: { type: Schema.ObjectId, default: function() { return new Schema.ObjectId(); } },
  type: String,
  budget: String,
  booking: [],
  photos: [],
  utilities: {},
  services: {},
  price: Number
}, { collection: 'rooms' });

mongoose.model('Room', RoomSchema);
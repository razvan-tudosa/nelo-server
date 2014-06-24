var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AlertSchema = new Schema({
  type: String,
  status: String,
  roomid: Schema.ObjectId,
  booking: {},
  user: {}
}, { collection: 'alerts' });

mongoose.model('Alert', AlertSchema);
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: String,
  password: String,
  email: String,
  phone: String,
  isAdmin: Boolean,
  myBookings: []
}, { collection: 'users' });

mongoose.model('User', UserSchema);

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new mongoose.Schema({
  username: String,
  password: String,
  salt: String
});

var User = module.exports = mongoose.model('User', userSchema);

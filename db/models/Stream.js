var mongoose = require('mongoose');
var User = require('./User');
var Schema = mongoose.Schema;


var twitterAccountSchema = new Schema({
  username: String,
  twitterId: String,
  avatarUrl: String
});

var streamSchema = new Schema({
  owner: {type: Schema.Types.ObjectId, ref: 'User'},
  name: String,
  users: [twitterAccountSchema]
});

var Stream = module.exports = mongoose.model('Stream', streamSchema);

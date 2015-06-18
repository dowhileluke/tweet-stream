var db = require('../db');
var twitter = require('twitter');
var twitConfig = require('../config/twitter.js');
var twitterApi = twitter(twitConfig);

var fn = module.exports = {};

var subscriptions = [];
var streamHandle;

fn.subscribe = function (socket, stream) {
  var userId = stream.owner;

  unsubscribe(userId);

  stream.users.forEach(function (twitterAccount) {
    subscriptions.push({
      userId: userId,
      twitterId: twitterAccount.twitterId,
      socket: socket
    });
  });

  update();
};

var unsubscribe = fn.unsubscribe = function (userId) {
  subscriptions = subscriptions.filter(function (sub) {
    return sub.userId !== userId;
  });
};

function update() {
  if (subscriptions.length) {
    var seen = {};
    var list = [];

    subscriptions.forEach(function (sub) {
      var id = sub.twitterId

      if (!seen[id]) {
        seen[id] = true;
        list.push(id);
      };
    });
  
    twitterApi.stream('statuses/filter', {follow: list.join(',')}, function (tweetStream) {
      // remove old stream
      if (streamHandle) {
        streamHandle.destroy();
      };

      streamHandle = tweetStream;

      tweetStream.on('data', announce);
      tweetStream.on('error', function (error) {
        // swallow error
      });
    });
  };
};

function announce(tweet) {
  subscriptions.forEach(function (sub) {
    if (sub.twitterId === tweet.user.id_str) {
      sub.socket.emit('tweet', tweet);
    };
  });
};

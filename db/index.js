var mongoose = require('mongoose');
var crypto = require('crypto');
var User = require('./models/User');
var Stream = require('./models/Stream');

var fn = module.exports = {
  genericError: {error: 'Database error!'}
};

fn.connect = function (conn) {
  mongoose.connect(conn || 'mongodb://localhost/tweet-stream');
};

fn.disconnect = function () {
  mongoose.connection.close();
};

(function accountActions() {
  fn.createUser = function (username, password, cb) {
    User.find({username: username}, function (err, users) {
      if (err) {
        return cb(err);
      } else if (users.length) {
        return cb(null, false);
      } else if (username && username.length && password && password.length) {
        var salt = crypto.randomBytes(16).toString('hex');
        var hash = generateHash(password, salt);

        var user = new User({
          username: username,
          password: hash,
          salt: salt
        });

        user.save(function (err, user) {
          if (err) {
            return cb(err);
          } else {
            return cb(null, user);
          };
        });
      } else {
        return cb(null, false);
      };
    });
  };

  function generateHash(password, salt) {
    var hash = crypto.createHash('sha256');

    hash.end(password + salt);

    return hash.read().toString('hex');
  };

  fn.authenticateUser = function (username, password, cb) {
    getSalt(username, function (err, salt) {
      if (err) {
        return cb(err);
      } else if (salt) {
        var hash = generateHash(password, salt);

        User.findOne({username: username, password: hash}, function (err, user) {
          if (err) {
            return cb(err);
          } else {
            return cb(null, user);
          };
        });
      } else {
        return cb(null, false);
      }
    });
  };

  function getSalt(username, cb) {
    User.findOne({username: username}, 'salt', function (err, user) {
      if (err) {
        return cb(err);
      } else if (user) {
        return cb(null, user.salt);
      } else {
        return cb(null, false);
      };
    });
  };

  fn.retrieveUser = function (id, hash, cb) {
    User.findOne({_id: id, password: hash}, function (err, user) {
      if (err) {
        return cb(err);
      } else if (user) {
        return cb(null, user);
      } else {
        return cb(null, false);
      };
    });
  };
})();

(function streamActions() {
  fn.getStreams = function (userId, cb) {
    Stream.find({owner: userId}, function (err, streams) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, streams);
      };
    });
  };

  fn.getStream = function (userId, streamId, cb) {
    Stream.findOne({owner: userId, _id: streamId}, function (err, stream) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, stream);
      };
    });
  };

  fn.createStream = function (userId, stream, cb) {
    // _id = 'new' which will cause an error
    delete stream._id;

    var s = new Stream(stream);

    s.owner = userId;
    s.save(function (err, doc) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, doc);
      };
    });
  };

  fn.updateStream = function (userId, stream, cb) {
    Stream.findOne({owner: userId, _id: stream._id}, function (err, doc) {
      if (err) {
        return cb(err);
      } else if (doc) {
        doc.name = stream.name;
        doc.users = stream.users;
        doc.save(function (err) {
          if (err) {
            return cb(err);
          } else {
            return cb(null, doc);
          };
        });
      } else {
        return cb(null, false);
      };
    });
  };

  fn.deleteStream = function (userId, streamId, cb) {
    Stream.findOneAndRemove({owner: userId, _id: streamId}, function (err, doc) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, !!doc);
      };
    });
  };
})();

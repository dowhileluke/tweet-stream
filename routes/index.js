var express = require('express');
var bodyParser = require('body-parser');
var db = require('../db');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var twitter = require('twitter');
var twitConfig = require('../config/twitter.js');
var twitterApi = twitter(twitConfig);

var api = module.exports = express.Router();
var account = express.Router();
var streams = express.Router();

(function accountRoutes() {
  account.post('/login', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    db.authenticateUser(username, password, function (err, user) {
      if (err) {
        console.error(err);
        res.json(db.genericError);
      } else if (user) {
        res.json(user);
      } else {
        res.json({message: 'Invalid username or password.'});
      };
    });
  });

  account.post('/register', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    db.createUser(username, password, function (err, user) {
      if (err) {
        console.error(err);
        res.json(db.genericError);
      } else if (user) {
        res.json(user);
      } else {
        res.json({message: 'Could not create user.'});
      };
    });
  });
})();

passport.use(new LocalStrategy(db.retrieveUser));
var doAuth = passport.authenticate('local', {session: false});

api.use(bodyParser.json());
api.use('/account', account);
api.use(passport.initialize(), function (req, res, next) {
  req.body.username = req.headers['tweet-stream-user'];
  req.body.password = req.headers['tweet-stream-hash'];
  next();
}, doAuth);

// anything below will be authenticated

(function twitterRoutes() {
  api.post('/twitter/lookup', function (req, res) {
    twitterApi.post('users/lookup', {screen_name: req.body.query}, function (err, users) {
      if (err) {
        res.json({error: 'Twitter API error'});
      } else {
        res.json(users);
      };
    });
  });
  api.post('/twitter/load', function (req, res) {
    var stream = req.body.stream;
    var before = req.body.before;
    var usernames = stream.users.map(function (user) {return user.username});
    var query = usernames.map(function (username) {return 'from:' + username}).join('+OR+');

    var options = {
      q: query,
      count: 25
    };

    if (before) {
      options.max_id = Number(before) - 1;
    };

    twitterApi.get('search/tweets', options, function (err, tweets){
      if (err) {
        res.json({error: 'Twitter API error'});
      } else {
        res.json(tweets);
      };
    });
  });
})();


(function streamsRoutes () {
  streams.get('/', function (req, res) {
    var userId = req.user._id;

    db.getStreams(userId, function (err, streams) {
      if (err) {
        res.json(db.genericError);
      } else {
        res.json(streams);
      };
    });
  });

  streams.post('/new', function (req, res) {
    var userId = req.user._id;
    db.createStream(userId, req.body, function (err, stream) {
      if (err) {
        res.json(db.genericError);
      } else {
        res.json(stream);
      };
    });
  });

  streams.get('/:id', function (req, res) {
    var userId = req.user._id;
    var streamId = req.params.id;
  
    db.getStream(userId, streamId, function (err, stream) {
      if (err) {
        res.json(db.genericError);
      } else {
        res.json(stream);
      };
    });
  });

  streams.post('/:id', function (req, res) {
    var userId = req.user._id;
  
    db.updateStream(userId, req.body, function (err, stream) {
      if (err) {
        res.json(db.genericError);
      } else {
        res.json(stream);
      };
    });
  });

  streams.delete('/:id', function (req, res) {
    var userId = req.user._id;
    var streamId = req.params.id;
  
    db.deleteStream(userId, streamId, function (err, confirm) {
      if (err) {
        res.json(db.genericError);
      } else {
        res.json({deleted: confirm});
      };
    });
  });
})();

api.use('/streams', streams);
api.use(function (req, res) {
  res.status(404).end();
});

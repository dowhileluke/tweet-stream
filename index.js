var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var routes = require('./routes');
var db = require('./db');
var tweets = require('./tweets');
var dbConfig = require('./config/mongo.js');

db.connect(dbConfig.connStr);

// routing
app.use('/api', routes);
app.use('/static', express.static('static'), function (req, res) {
  res.status(404).end();
});
app.use('/', function (req, res) {
  res.sendFile('static/index.html', {root: __dirname});
});

io.on('connection', function(socket){
  // try to associate a connection with a user so we can unsub on disconnect.
  var userId;

  socket.on('subscribe', function(stream) {
    userId = stream.userId;
    tweets.subscribe(socket, stream);
  });

  socket.on('disconnect', function() {
    if (userId) {
      tweets.unsubscribe(userId);
    };
  });
});

// start the server
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('running @ localhost:' + port);
});

'use strict';

var app = angular.module('tweet-stream-controllers', ['ngRoute']);

app.controller('MainCtrl', function ($scope, Account){
  $scope.$watch(function () {
    return Account.user;
  }, function (curr, prev) {
    $scope.user = curr;
  });

  // Account.login('testUser', 'testUser');
});

app.controller('AccountFormCtrl', function ($scope, $location, Account) {
  $scope.account = {};

  $scope.login = function () {
    Account.login($scope.account.username, $scope.account.password).then(function (response) {
      $location.path('/streams');
    }, function (reason) {
      $scope.error = reason;
    });
  };

  $scope.register = function () {
    if ($scope.account.password === $scope.account.again) {
      Account.register($scope.account.username, $scope.account.password).then(function (response) {
        $location.path('/streams');
      }, function (reason) {
        $scope.error = reason;
      });
    };
  };
});

app.controller('AccountLogoutCtrl', function (Account, $location) {
    Account.logout();
    $location.path('/account/login');
});

app.controller('StreamsIndexCtrl', function ($scope, Account, Stream, $window) {
  Account.require();

  $scope.streams = Stream.query();

  $scope.delete = function (idx) {
    var candidate = $scope.streams[idx];

    if ($window.confirm('Really delete ' + candidate.name + '?')) {
      candidate.$delete();
    };
  };
});

app.controller('StreamsEditCtrl', function ($scope, $location, Account, Stream, $routeParams) {
  Account.require();

  var streamId = $routeParams.id;
  var stream;

  if (streamId) {
    $scope.action = 'Edit';
    stream = Stream.get({id: streamId});
  } else {
    $scope.action = 'New';
    stream = new Stream({
      _id: 'new',
      users: []
    });
  };

  $scope.stream = stream;
  $scope.save = function () {
    if (stream.name) {
      stream.$save().then(function (result) {
        $location.path('/streams');
      });
    };
  };
});

app.controller('StreamsRealtimeCtrl', function ($scope, Account, Stream, $routeParams, socket, $http, $log) {
  Account.require();

  var oldest;
  $scope.allTweets = [];
  $scope.pending = true;
  var streamId = $routeParams.id;
  var stream = $scope.stream = Stream.get({id: streamId}, function () {
    socket.emit('subscribe', stream);
    socket.on('tweet', handleTweet);
    $scope.$on('$destroy', function () {
      socket.removeListener('tweet', handleTweet);
    });
    getTweets();
  });

  function handleTweet(tweet) {
    $scope.allTweets.unshift(tweet);
  };

  var getTweets = $scope.getTweets = function () {
    $scope.pending = true;

    var options = {
      stream: stream
    };

    if (oldest) {
      options.before = oldest;
    };

    $http.post('/api/twitter/load', options).then(function (result) {
      var tweets = result.data.statuses;

      if (tweets && tweets.length) {
        $scope.allTweets = $scope.allTweets.concat(tweets);
        oldest = tweets.reverse()[0].id;
      };

      $scope.pending = false;
    }).catch(function (reason) {
      $log.error(reason);
      // $scope.pending = false;
    });
  };
});

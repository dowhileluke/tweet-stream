'use strict';

var app = angular.module('tweet-stream', ['ngRoute', 'ngResource', 'btford.socket-io']);

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  var path = '/static/partials/';

  $routeProvider
    .when('/', {
      templateUrl: path + 'index.html',
      controller: false
    })
    .when('/account/login', {
      templateUrl: path + 'account/login.html',
      controller: 'AccountFormCtrl'
    })
    .when('/account/register', {
      templateUrl: path + 'account/register.html',
      controller: 'AccountFormCtrl'
    })
    .when('/account/logout', {
      template: false,
      controller: 'AccountLogoutCtrl'
    })
    .when('/streams', {
      templateUrl: path + 'streams/index.html',
      controller: 'StreamsIndexCtrl'
    })
    .when('/streams/new', {
      templateUrl: path + 'streams/edit.html',
      controller: 'StreamsEditCtrl'
    })
    .when('/streams/:id', {
      templateUrl: path + 'streams/realtime.html',
      controller: 'StreamsRealtimeCtrl'
    })
    .when('/streams/:id/edit', {
      templateUrl: path + 'streams/edit.html',
      controller: 'StreamsEditCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
}]);

app.service('Account', function ($http, $q, $location) {
  var fn = {};

  fn.require = function () {
    if (!fn.user) {
      $location.path('/account/login');
    };
  };

  function setUser(user) {
    if (user) {
      $http.defaults.headers.common['tweet-stream-user'] = user._id;
      $http.defaults.headers.common['tweet-stream-hash'] = user.password;
      fn.user = user;
    } else {
      delete $http.defaults.headers.common['tweet-stream-user'];
      delete $http.defaults.headers.common['tweet-stream-hash'];
      delete fn.user;
    };

    return user;
  };

  function postCredentials(url) {
    return function (username, password) {
      return $http.post(url, {
        username: username,
        password: password
      }).then(function (response) {
        var data = response.data;

        if (data._id) {
          return setUser(data);
        } else {
          return $q.reject(data.message || data.error);
        };
      });
    };
  };

  fn.login = postCredentials('/api/account/login');
  fn.register = postCredentials('/api/account/register');
  fn.logout = function () {
    setUser();
  };

  return fn;
});

app.factory('socket', function (socketFactory) {
  return socketFactory();
});

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

app.factory('Stream', function ($resource) {
  return $resource('/api/streams/:id', {id: '@_id'});
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

  function getTweets() {
    var options = {
      stream: stream
    };

    if (oldest) {
      options.before = oldest;
    };

    $http.post('/api/twitter/load', options).then(function (result) {
      var tweets = result.data.statuses;

      if (tweets.length) {
        $scope.allTweets = $scope.allTweets.concat(tweets);
        oldest = tweets.reverse()[0].id;
      };
    });
  };

});

app.directive('twitterList', function () {
  return {
    restrict: 'E',
    scope: {
      users: '='
    },
    template: '<div class="twitter-list">' +
                '<label>Follow a Twitter user:</label>' +
                '<input ng-model="name" placeholder="Enter a nickname" />' +
                '<button type="button" ng-click="findUser()">Add</button>' +
                '<ul>' +
                  '<li ng-repeat="u in users">' +
                    '@{{u.username}}' +
                    ' <span ng-click="remove($index)">(X)</span>' +
                  '</li>' +
                '</ul>' +
              '</div>',
    controller: function ($scope, $http) {
      $scope.findUser = function () {
        if ($scope.name && $scope.name.length) {
          var query = $scope.name.replace('@', '').replace(/\s+/, '');

          $http.post('/api/twitter/lookup', {query: query}).then(function (result) {
            var following = $scope.users.map(function (user) {
              return user.username;
            });

            result.data.forEach(function (user) {
              if (following.indexOf(user.screen_name) < 0) {
                $scope.users.push({
                  username:  user.screen_name,
                  twitterId: user.id_str,
                  avatarUrl: user.profile_image_url
                });
              };
            });

            $scope.name = '';
          });
        };
      };

      $scope.remove = function (idx) {
        $scope.users.splice(idx, 1);
      };
    },
  };
});

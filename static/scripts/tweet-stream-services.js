'use strict';

var app = angular.module('tweet-stream-services', ['ngResource', 'btford.socket-io']);

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

app.factory('Stream', function ($resource) {
  return $resource('/api/streams/:id', {id: '@_id'});
});

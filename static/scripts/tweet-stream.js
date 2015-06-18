'use strict';

var app = angular.module('tweet-stream', ['ngRoute', 'tweet-stream-controllers', 'tweet-stream-services']);

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

app.directive('twitterList', function () {
  return {
    restrict: 'E',
    scope: {
      users: '='
    },
    template: '<div class="twitter-list">' +
                '<div class="form-group">' +
                  '<label>Follow a Twitter user:</label>' +
                  '<input ng-model="name" class="form-control" placeholder="Enter a nickname" />' +
                  '<button type="button" ng-click="findUser()" class="btn btn-primary btn-sm"><i class="glyphicon glyphicon-plus"></i> Add</button>' +
                '</div>' +
                '<table class="table table-striped">' +
                  '<tr>' +
                    '<th></th>' +
                    '<th>Twitter user</th>' +
                    '<th>Actions</th>' +
                  '</tr>' +
                  '<tr ng-repeat="u in users">' +
                    '<td><img src="{{u.avatarUrl}}" /></td>' +
                    '<td>@{{u.username}}</td>' +
                    '<td><i class="glyphicon glyphicon-trash" ng-click="remove($index)"></i></td>' +
                  '</tr>' +
                '</table>' +
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

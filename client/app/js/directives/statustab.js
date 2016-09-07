angular.module('trafficEnv')
    .directive('statusTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', function($scope) {
                // TODO
            }],
            templateUrl: 'templates/status-tab.html',
            // replace: true
        };
    });

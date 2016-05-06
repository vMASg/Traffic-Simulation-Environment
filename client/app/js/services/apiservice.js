angular.module('APIServices', ['ngResource'])
    .factory('scriptServices', ['$resource', function($resource){
        return $resource('/scripts/:id', {}, {
            update: {
                method: 'PUT'
            }
        });
    }]);

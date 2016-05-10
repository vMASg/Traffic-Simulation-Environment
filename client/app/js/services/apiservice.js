angular.module('APIServices', ['ngResource'])
    .factory('scriptServices', ['$http', function($http){
        return {
            getScriptCollection: function () {
                return $http.get('/scripts');
            },
            getScript: function (id) {
                return $http.get('/scripts/' + encodeURIComponent(id));
            },
            saveScript: function (name, code) {
                var data = {name: name, code: code};
                return $http.post('/scripts', angular.toJson(data));
            },
            updateScript: function (id, code) {
                return $http.put('/scripts/' + encodeURIComponent(id), code, {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            }
        };
    }]);
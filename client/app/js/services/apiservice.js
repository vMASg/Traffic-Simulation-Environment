angular.module('APIServices', [])
    .factory('scriptServices', ['$http', function($http){
        return {
            getScriptCollection: function () {
                return $http.get('/scripts');
            },
            getScript: function (id) {
                return $http.get('/scripts/' + encodeURIComponent(id), {
                    transformResponse: []
                });
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
    }])

    .factory('modelServices', ['$http', function($http){
        return {
            getModelCollection: function () {
                return $http.get('/models')
            }
        };
    }]);

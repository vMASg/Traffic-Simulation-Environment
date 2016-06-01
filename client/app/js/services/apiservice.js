angular.module('APIServices', [])
    .factory('scriptServices', ['$http', function($http){
        return {
            getScriptCollection: function () {
                return $http.get('/scripts');
            },
            getScript: function (id, info) {
                info = info || [];
                if (info.length == 0 || info.indexOf('onlycode') >= 0) {
                    return $http.get('/scripts/' + encodeURIComponent(id), {
                        transformResponse: []
                    });
                } else {
                    return $http.get('/scripts/' + encodeURIComponent(id) + '?' + info.join('&'));
                }
            },
            saveScript: function (name, parent, code) {
                var data = {name: name, parent: parent, code: code};
                return $http.post('/scripts', angular.toJson(data));
            },
            updateScript: function (id, code) {
                return $http.put('/scripts/' + encodeURIComponent(id), code, {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            },
            deleteScript: function (id) {
                return $http.delete('/scripts/' + encodeURIComponent(id));
            }
        };
    }])

    .factory('modelServices', ['$http', function($http){
        return {
            getModelCollection: function () {
                return $http.get('/models');
            },
            runImmediateScript: function (modelId, code) {
                return $http.post('/models/' + encodeURIComponent(modelId) + '/runscript', code, {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            }
        };
    }]);

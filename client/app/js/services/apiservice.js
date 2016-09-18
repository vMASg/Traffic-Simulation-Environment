angular.module('APIServices', [])
    .factory('scriptServices', ['$http', function($http){
        return {
            getScriptCollection: function () {
                return $http.get('/scripts');
            },
            getScript: function (id, hash, info) {
                if (typeof hash == 'object') {
                    info = hash || [];
                    hash = null;
                } else {
                    info = info || [];
                }
                hash = hash&&hash.length?'/'+hash:'';
                if (info.length === 0 || info.indexOf('onlycode') >= 0) {
                    return $http.get('/scripts/' + encodeURIComponent(id) + hash, {
                        transformResponse: []
                    });
                } else {
                    return $http.get('/scripts/' + encodeURIComponent(id) + hash + '?' + info.join('&'));
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
            getModel: function (modelId) {
                return $http.get('/models/' + encodeURIComponent(modelId));
            },
            uploadModel: function (file) {
                var formData = new FormData();
                var def = {
                    func: function (data) {},
                    then: function (f) {
                        def.func = f;
                    }
                };
                formData.append('model', file, file.name);
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/models', true);
                xhr.onload = function (response) {
                    if (xhr.status == 200) {
                        def.func(angular.fromJson(xhr.response));
                    }
                };
                xhr.send(formData);
                return def;
            },
            runImmediateScript: function (modelId, code) {
                return $http.post('/models/' + encodeURIComponent(modelId) + '/runscript', code, {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            }
        };
    }])

    .factory('pipelineServices', ['$http', function($http){
        return {
            getPipelineCollection: function () {
                return $http.get('/pipelines');
            },
            getPipeline: function (id, hash) {
                hash = hash&&hash.length?'/'+hash:'';
                return $http.get('/pipelines/' + encodeURIComponent(id) + hash);
            },
            savePipeline: function (name, parent, graph) {
                var data = {name: name, parent: parent, data: angular.toJson(graph)};
                return $http.post('/pipelines', data);
            },
            updatePipeline: function (id, graph) {
                return $http.put('/pipelines/' + encodeURIComponent(id), angular.toJson(graph));
            },
            deletePipeline: function (id) {
                return $http.delete('/pipelines/' + encodeURIComponent(id));
            },
            runPipeline: function (id, pipeline_input) {
                var url = '/pipelines/' + encodeURIComponent(id) + '/run';
                return pipeline_input?$http.post(url, angular.toJson(pipeline_input)):$http.get(url);
            }
        };
    }])

    .factory('interfaceServices', ['$http', function($http){
        return {
            getInterfaceCollection: function () {
                return $http.get('/interfaces');
            },
            getInterface: function (id) {
                return $http.get('/interfaces/' + encodeURIComponent(id));
            },
            saveInterface: function (name, parent, code) {
                var data = {name: name, parent: parent, code: code};
                return $http.post('/interfaces', angular.toJson(data));
            },
            updateInterface: function (id, code) {
                return $http.put('/interfaces/' + encodeURIComponent(id), code, {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                });
            },
            deleteInterface: function (id) {
                return $http.delete('/interfaces/' + encodeURIComponent(id));
            }
        };
    }])

    .factory('finishedTasksServices', ['$http', function($http){
        return {
            getFinishedTaskCollection: function () {
                return $http.get('/executions');
            },
            getFinishedTask: function (id) {
                return $http.get('/executions/' + encodeURIComponent(id));
            },
            deleteFinishedTask: function (id) {
                return $http.delete('/executions/' + encodeURIComponent(id));
            }
        };
    }]);


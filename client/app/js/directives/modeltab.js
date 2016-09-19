angular.module('trafficEnv')
    .directive('modelTab', function(){
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'modelServices', 'finishedTasksServices', 'socket', function($scope, modelServices, finishedTasksServices, socket) {

                if (!$scope.data.id) {
                    $scope.panel = 'Upload';
                    $scope.uploadFile = function (event) {
                        var file = event.target.files[0];
                        if (file.name.slice(-4) == '.ang') {
                            modelServices.uploadModel(file).then(function (data) {
                                $scope.switchNew({ntab: {
                                    id: data.id,
                                    name: data.name,
                                    type: data.type
                                }});
                            });
                        }
                    };
                    return;
                }

                $scope.panel = 'Query';

                $scope.aceOption = {
                    mode: 'python',
                    theme: 'monokai',
                    showPrintMargin: false,
                    onLoad: function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/python");
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                    }
                };

                $scope.code = '';
                $scope.scriptResult = [];

                $scope.runImmediate = function () {
                    $scope.scriptResult = [];
                    modelServices.runImmediateScript($scope.data.id, $scope.code).then(function (data) {
                        // $scope.scriptResult = data.data.output;
                        console.log(data);
                        var channel_name = data.data.channel_name;
                        socket.emit('subscribe', {'channel': channel_name});

                        var eventCallback = function (data_r) {
                            $scope.scriptResult = $scope.scriptResult.concat(data_r.data.split('\n'));
                        };

                        var eotCallback = function () {
                            socket.emit('unsubscribe', {'channel': channel_name});
                            socket.removeListener(channel_name + ':event', eventCallback);
                            socket.removeListener(channel_name + ':EOT', eotCallback);
                        };

                        socket.on(channel_name + ':event', eventCallback);
                        socket.on(channel_name + ':EOT', eotCallback);
                    });
                };

                $scope.historyElements = {};

                $scope.fullDate = function (timestamp) {
                    return timestamp?moment(timestamp,'X').format('DD/MM/YY HH:mm:ss'):'-';
                };

                $scope.relativeDate = function (timestamp) {
                    return timestamp?moment(timestamp,'X').fromNow():'-';
                };

                var appendToHistory = function (data) {
                    $scope.historyElements[data.data.id] = data.data.meta;
                };

                modelServices.getModel($scope.data.id).then(function (data) {
                    var changes = data.data.changes;
                    var len = changes.length;
                    for (var i = 0; i < len; ++i) {
                        finishedTasksServices.getFinishedTask(changes[i]).then(appendToHistory);
                    }
                });
            }],
            templateUrl: 'templates/model-tab.html'
        };
    });

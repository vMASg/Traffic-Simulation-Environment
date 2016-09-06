angular.module('trafficEnv')
    .directive('modelTab', function(){
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'modelServices', 'socket', function($scope, modelServices, socket) {
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
            }],
            templateUrl: 'templates/model-tab.html'
        };
    });

angular.module('trafficEnv')
    .directive('statusTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'socket', function($scope, socket) {

                var self = this;
                var channelInfo = {};

                $scope.enqueuedTasks = {};
                $scope.runningTasks = {};
                var processEvent = function (data) {
                    if (data.operation == 'enqueued') {
                        $scope.enqueuedTasks[data.channel] = {};
                        channelInfo[data.channel].queue = $scope.enqueuedTasks;
                    } else if (data.operation == 'dequeued') {
                        var e = $scope.enqueuedTasks[data.channel];
                        $scope.enqueuedTasks[data.channel] = undefined;
                        delete $scope.enqueuedTasks[data.channel];
                        $scope.runningTasks[data.channel] = e;
                        channelInfo[data.channel].queue = $scope.runningTasks;
                    } else if (data.operation == 'finished') {
                        delete $scope.runningTasks[data.channel];
                        unsubscribe(data.channel);
                        // TODO query new resource
                    }
                };

                // socket.emit('subscribe', {'channel': 'executions'});

                var unsubscribe = function (channelName) {
                    socket.removeListener(channelName + ':meta', channelInfo[channelName].metaFunc);
                    socket.emit('unsubscribe', {'channel': channelName});
                    delete channelInfo[channelName];
                };

                var onMeta = function (channelName, executionMeta) {
                    channelInfo[channelName].queue[channelName] = executionMeta;
                };

                var onExecutionsEvent = function (executionData) {
                    if (executionData.data.operation == 'enqueued') {
                        socket.emit('subscribe', {'channel': executionData.data.channel});
                        var newOnMeta = onMeta.bind(self, executionData.data.channel);
                        channelInfo[executionData.data.channel] = {metaFunc: newOnMeta};
                        processEvent(executionData.data);
                        socket.on(executionData.data.channel + ':meta', newOnMeta);
                    } else {
                        processEvent(executionData.data);
                    }
                };

                socket.on('executions:event', onExecutionsEvent);
                $scope.$on('$destroy', function () {
                    socket.removeListener('executions:event', onExecutionsEvent);
                    var channels = [];
                    for (var elem in channelInfo) {
                        channels.push(elem);
                    }

                    for (var i = 0; i < channels.length; ++i) {
                        unsubscribe(channels[i]);
                    }
                });

            }],
            templateUrl: 'templates/status-tab.html',
            // replace: true
        };
    });

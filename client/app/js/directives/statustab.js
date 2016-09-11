angular.module('trafficEnv')
    .directive('statusTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'socket', 'finishedTasksServices', function($scope, socket, finishedTasksServices) {

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

                var onExecutionsCatchUp = function (transmissionsData) {
                    var transmissions = transmissionsData.transmissions;
                    var i, trans, finishedTasks = [];
                    for (i = 0; i < transmissions.length; ++i) {
                        trans = transmissions[i];
                        if (trans.operation == 'finished') {
                            finishedTasks.push(trans.channel);
                        }
                    }
                    for (i = 0; i < transmissions.length; ++i) {
                        trans = transmissions[i];
                        if (finishedTasks.indexOf(trans.channel) == -1) {
                            onExecutionsEvent({data: trans});
                        }
                    }
                    // console.log(transmissions);
                };

                var onNewFinishedTask = function (taskData) {
                    $scope.finishedTasks.push(taskData);
                };

                socket.on('executions:event', onExecutionsEvent);
                socket.on('executions:catchUp', onExecutionsCatchUp);
                $scope.$on('$destroy', function () {
                    socket.removeListener('executions:event', onExecutionsEvent);
                    socket.removeListener('executions:catchUp', onExecutionsCatchUp);
                    socket.removeListener('new_finished_task', onNewFinishedTask);
                    var channels = [];
                    for (var elem in channelInfo) {
                        channels.push(elem);
                    }

                    for (var i = 0; i < channels.length; ++i) {
                        unsubscribe(channels[i]);
                    }
                });

                socket.emit('subscribe', {'channel': 'executions'});

                // Adding finished tasks queue

                $scope.finishedTasks = [];
                $scope.fullDate = function (timestamp) {
                    return timestamp?moment(timestamp,'X').format('DD/MM/YY HH:mm:ss'):'-';
                };

                $scope.relativeDate = function (timestamp) {
                    return timestamp?moment(timestamp,'X').fromNow():'-';
                };

                finishedTasksServices.getFinishedTaskCollection().then(function (data) {
                    $scope.finishedTasks = data.data;
                });

                $scope.toggleVisibilityFinished = function (data) {
                    data.isVisible = !data.isVisible;
                };

                socket.on('new_finished_task', onNewFinishedTask);

            }],
            templateUrl: 'templates/status-tab.html',
            // replace: true
        };
    });

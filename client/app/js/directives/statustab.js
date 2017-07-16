angular.module('trafficEnv')
    .directive('statusTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'socket', 'finishedTasksServices', 'pipelineServices', function($scope, socket, finishedTasksServices, pipelineServices) {

                var self = this;
                var channelInfo = {};

                $scope.enqueuedTasks = {};
                $scope.runningTasks = {};
                $scope.inpoutTrans = {};
                var processEvent = function (data) {
                    if (data.operation == 'enqueued') {
                        $scope.enqueuedTasks[data.channel] = {};
                        channelInfo[data.channel].queue = $scope.enqueuedTasks;
                    } else if (data.operation == 'dequeued') {
                        var e = $scope.enqueuedTasks[data.channel];
                        $scope.enqueuedTasks[data.channel] = undefined;
                        delete $scope.enqueuedTasks[data.channel];
                        $scope.inpoutTrans[data.channel] = {isVisible: false};
                        $scope.runningTasks[data.channel] = e;
                        channelInfo[data.channel].queue = $scope.runningTasks;
                    } else if (data.operation == 'finished') {
                        delete $scope.runningTasks[data.channel];
                        unsubscribe(data.channel);
                    }
                };

                var unsubscribe = function (channelName) {
                    socket.removeListener(channelName + ':meta', channelInfo[channelName].metaFunc);
                    socket.emit('unsubscribe', {'channel': channelName});
                    var inpoutTrans = $scope.inpoutTrans[channelName];
                    socket.removeListener(channelName + ':meta', inpoutTrans.metaFuncMeta);
                    socket.removeListener(channelName + ':catchUp', inpoutTrans.metaFuncCatchUp);
                    socket.removeListener(channelName + ':event', inpoutTrans.metaFuncEvent);
                    delete $scope.inpoutTrans[channelName];
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

                var onDeletedFinishedTask = function (taskData) {
                    var len = $scope.finishedTasks.length;
                    for (var i = 0; i < len; ++i) {
                        if ($scope.finishedTasks[i].id == taskData.id) {
                            delete $scope.finishedTasks.splice(i, 1)[0];
                            break;
                        }
                    }
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
                    var tasks = data.data;
                    for (var i = 0, len = tasks.length; i < len; ++i) {
                        var task = tasks[i].data;
                        if (task.meta.type == 'pipeline') {
                            pipelineServices.getPipeline(task.meta.task).then((function (task, response) {
                                var info = response.data;
                                task.meta.task = {
                                    id: info.id,
                                    name: info.name,
                                    path: info.path
                                };
                                var hashinfo = info.hash.find(h => h.id === task.meta.hash);
                                task.meta.hash = hashinfo || task.meta.hash;
                            }).bind(this, task));
                        }
                    }
                    $scope.finishedTasks = tasks;
                });

                var onChannelCatchUp = function (channelName, transmissionsData) {
                    var transmissions = transmissionsData.transmissions;
                    $scope.inpoutTrans[channelName].transmissions = transmissions;
                };

                var onChannelEvent = function (channelName, data) {
                    $scope.inpoutTrans[channelName].transmissions.concat(data.data.split('\n'));
                };

                var onMetaChannel = function (channelName, data) {
                    $scope.inpoutTrans[channelName].meta = data;
                    if (data.type == 'pipeline' && data.task) {
                        pipelineServices.getPipeline(data.task).then(function (response) {
                            var info = response.data;
                            $scope.inpoutTrans[channelName].meta.task = {
                                id: info.id,
                                name: info.name,
                                path: info.path
                            };
                            var hashinfo = info.hash.find(h => h.id === data.hash);
                            $scope.inpoutTrans[channelName].meta.hash = hashinfo || data.hash;
                        });
                    }
                };

                $scope.formatHash = function (hash) {
                    return moment(hash.timestamp, 'X').format('DD/MM/YY HH:mm:ss') + ' - ' + hash.author.split(" ")[0] + ' ('+ hash.id.slice(0,7) + ')';
                    // return moment(hash.timestamp, 'X').format('ddd MMM D HH:mm:ss Y') + ' - ' + hash.author.split(" ")[0] + ' ('+ hash.id.slice(0,7) + ')';
                };

                $scope.toggleVisibility = function (channelName) {
                    if (!$scope.inpoutTrans[channelName].subscribed) {
                        var metaFuncCatchUp = onChannelCatchUp.bind(self, channelName);
                        var metaFuncEvent = onChannelEvent.bind(self, channelName);
                        var metaFuncMeta = onMetaChannel.bind(self, channelName);
                        $scope.inpoutTrans[channelName].metaFuncCatchUp = metaFuncMeta;
                        $scope.inpoutTrans[channelName].metaFuncCatchUp = metaFuncCatchUp;
                        $scope.inpoutTrans[channelName].metaFuncEvent = metaFuncEvent;
                        socket.on(channelName + ':meta', metaFuncMeta);
                        socket.on(channelName + ':catchUp', metaFuncCatchUp);
                        socket.on(channelName + ':event', metaFuncEvent);
                        socket.emit('subscribe', {'channel': channelName});
                        $scope.inpoutTrans[channelName].subscribed = true;
                    }
                    $scope.inpoutTrans[channelName].isVisible = !$scope.inpoutTrans[channelName].isVisible;
                };

                $scope.toggleVisibilityFinished = function (data) {
                    data.isVisible = !data.isVisible;
                };

                $scope.abortTask = function ($event, channelName) {
                    $event.stopPropagation();
                    socket.emit(channelName + ':abort');
                };

                $scope.deleteResult = function ($event, id) {
                    $event.stopPropagation();
                    finishedTasksServices.deleteFinishedTask(id);
                };

                socket.on('new_finished_task', onNewFinishedTask);
                socket.on('deleted_finished_task', onDeletedFinishedTask);

            }],
            templateUrl: 'templates/status-tab.html',
            // replace: true
        };
    });

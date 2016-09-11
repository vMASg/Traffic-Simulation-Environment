angular.module('trafficEnv')
    .directive('panelHeader', function(){
        return {
            templateUrl: 'templates/panel-header.html',
            controller: ['$scope', 'socket', '$timeout',
            function($scope, socket, $timeout) {

                $scope.serverStatus = 'status-ok';

                var computeStatus = function () {
                    if ($scope.executionQueue.length > 0 && $scope.runningJobs.length > 0) {
                        $scope.serverStatus = 'status-busy';
                    } else if ($scope.executionQueue.length > 10) {
                        $scope.serverStatus = 'status-ko';
                    } else {
                        $scope.serverStatus = 'status-ok';
                    }
                };

                $scope.executionQueue = [];
                $scope.runningJobs = [];
                var processEvent = function (data) {
                    if (data.operation == 'enqueued') {
                        $scope.executionQueue.push(data.channel);
                    } else if (data.operation == 'dequeued') {
                        var index = $scope.executionQueue.indexOf(data.channel);
                        var e = $scope.executionQueue.splice(index, 1)[0];
                        $scope.runningJobs.push(e);
                    } else if (data.operation == 'finished') {
                        var index = $scope.runningJobs.indexOf(data.channel);
                        delete $scope.runningJobs.splice(index, 1)[0];
                    }
                    computeStatus();
                };

                $scope.openStatusDetail = function () {
                    $scope.select({
                        id: '<SERVER_STATUS>',
                        name: 'Server status detail',
                        type: 'status'
                    });
                };

                // $timeout(function () {
                //     $scope.serverStatus = 'status-busy';
                // }, 2000);

                // $timeout(function () {
                //     $scope.serverStatus = 'status-ko';
                // }, 5000);

                // TODO add catchup listener
                socket.on('executions:event', function onExecutionsEvent (data) {
                    processEvent(data.data);
                });

                var cachedUp = false;

                socket.on('executions:catchUp', function (data) {
                    if (!cachedUp) {
                        cachedUp = true;
                        var len = data.transmissions.length;
                        for (var i = 0; i < len; ++i) {
                            processEvent(data.transmissions[i]);
                        }
                    }
                });

                // Subscribe to new pipeline executions
                socket.emit('subscribe', {'channel': 'executions'});

            }],
        };
    });

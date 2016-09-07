angular.module('trafficEnv')
    .directive('panelHeader', function(){
        return {
            templateUrl: 'templates/panel-header.html',
            controller: ['$scope', 'socket', '$timeout',
            function($scope, socket, $timeout) {

                $scope.running_tasks = 0;
                $scope.queue_size = 0;
                $scope.serverStatus = 'ok';

                // $timeout(function () {
                //     $scope.serverStatus = 'busy';
                // }, 2000);

                // $timeout(function () {
                //     $scope.serverStatus = 'ko';
                // }, 5000);

                // Subscribe to new pipeline executions
                socket.emit('subscribe', {'channel': 'executions'});

                socket.on('executions:event', function onExecutionsEvent (data) {
                    console.log(data);
                    socket.emit('subscribe', {'channel': data.data.channel});
                    var onChannelEvent = function (data) {
                        console.log(data);
                    };
                    var onChannelCatchUp = function (data) {
                        console.log(data);
                    };
                    var onChannelEOT = function (finalData) {
                        console.log(finalData);
                        socket.emit('unsubscribe', {'channel': data.data.channel});
                        socket.removeListener(data.data.channel + ':event', onChannelEvent);
                        socket.removeListener(data.data.channel + ':catchUp', onChannelCatchUp);
                        socket.removeListener(data.data.channel + ':EOT', onChannelEOT);
                    };
                    socket.on(data.data.channel + ':event', onChannelEvent);
                    socket.on(data.data.channel + ':catchUp', onChannelCatchUp);
                    socket.on(data.data.channel + ':EOT', onChannelEOT);
                });

            }],
        };
    });

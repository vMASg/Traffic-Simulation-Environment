angular.module('trafficEnv', ['treeControl', 'ui.ace', 'APIServices', 'ui.bootstrap', 'btford.socket-io', 'ang-drag-drop'])

    .factory('socket', ['socketFactory', function(socketFactory){
        return socketFactory({
            prefix: 'event-',
            ioSocket: io.connect('/subscription')
        });
    }]);

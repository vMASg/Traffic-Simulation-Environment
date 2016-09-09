angular.module('trafficEnv', ['treeControl', 'ui.ace', 'APIServices', 'ui.bootstrap', 'btford.socket-io', 'ang-drag-drop'], function($controllerProvider, $compileProvider, $provide) {
    providers = {
        $controllerProvider: $controllerProvider,
        $compileProvider: $compileProvider,
        $provide: $provide
    };
})

    .factory('socket', ['socketFactory', function(socketFactory){
        return socketFactory({
            prefix: 'event-',
            ioSocket: io.connect('/subscription')
        });
    }]);

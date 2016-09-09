angular.module('trafficEnv')
    .directive('interfaceTab', ['$compile', '$timeout', function($compile, $timeout) {
        var self = this;
        var queueLen = angular.module('trafficEnv')._invokeQueue.length;
        var loadedStuff = angular.module('trafficEnv')._invokeQueue.map(function (a) { return a[2][0]; });

        function addScript (path) {
            var scriptElement = document.createElement('script');
            scriptElement.src = path;
            self.s = angular.element(scriptElement);
            angular.element(document.body).append(self.s);
        }

        function registerRecompile(element, $scope) {
            var queue = angular.module('trafficEnv')._invokeQueue;
            for(var i=queueLen;i<queue.length;i++) {
                var call = queue[i];
                // call is in the form [providerName, providerFunc, providerArguments]
                var provider = providers[call[0]];
                if(provider) {
                    // e.g. $controllerProvider.register("Ctrl", function() { ... })
                    provider[call[1]].apply(provider, call[2]);
                }
            }

            // compile the new element
            element.injector().invoke(function() {
                $compile(element)($scope);
                $scope.$apply();
            });
        }

        function deregisterStuff (names) {
            var newStuff = names.filter(function (e) { return loadedStuff.indexOf(e) == -1; });
            var invokeQueue = angular.module('trafficEnv')._invokeQueue;
            angular.module('trafficEnv')._invokeQueue = invokeQueue.filter(function (e) { return newStuff.indexOf(e[2][0]) == -1; });
            // var len = invokeQueue.length;
            // for (var i = 0; i < len; ++i) {
            //     if (newStuff.indexOf(invokeQueue[i][2][0]) > 0) {
            //         newStuff.splice()
            //     }
            // }
            // angular.module('trafficEnv')._invokeQueue = angular.module('trafficEnv')._invokeQueue.slice(0, queueLen);
            // console.assert(angular.module('trafficEnv')._invokeQueue.length == queueLen);
        }

        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            compile: function compile(tElement, tAttrs) {
                // var directiveGetter = $parse(tAttrs.tabType);
                return function postLink($scope, element) {
                    // element.removeAttr('data-tab-type');

                    // var directive = directiveGetter(scope);
                    if (!element.attr('ng-include')) {
                        addScript('interfaces/' + encodeURIComponent($scope.data.id.replace(/\.intf$/, '.js')));
                        element.attr('ng-include', '"' + 'interfaces/' + encodeURIComponent($scope.data.id.replace(/\.intf$/, '.html')) + '"');
                        $timeout(function () { registerRecompile(element, $scope); }, 100);
                        $scope.$on('$destroy', function () {
                            // console.log(angular.module('trafficEnv')._invokeQueue.map(a => a[2][0]));
                            deregisterStuff(angular.module('trafficEnv')._invokeQueue.map(function (a) { return a[2][0]; }));
                            self.s.remove();
                        });
                    }

                };
            },
            replace: true
        };
    }]);

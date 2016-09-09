angular.module('trafficEnv')
    .directive('interfaceTab', ['$compile', '$timeout', function($compile, $timeout) {
        var self = this;
        var queueLen = angular.module('trafficEnv')._invokeQueue.length;

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
                        // console.log(angular.module('trafficEnv')._invokeQueue.map(a => a[2][0]));
                        $timeout(function () { registerRecompile(element, $scope); }, 2000);
                        $scope.$on('$destroy', function () {
                            document.body.removeChild(self.s);
                        });
                    }

                };
            },
            replace: true
        };
    }]);

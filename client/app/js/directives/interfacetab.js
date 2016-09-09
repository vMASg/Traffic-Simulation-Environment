angular.module('trafficEnv')
    .directive('interfaceTab', ['$compile', '$timeout', function($compile, $timeout) {
        var self = this;
        function addScript (path) {
            self.s = document.createElement('script');
            s.src = path;
            document.body.appendChild(s);
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
                        element.attr('ng-include', '"' + 'interfaces/' + encodeURIComponent($scope.data.id.replace(/\.intf$/, '.html')) + '"');
                        addScript('interfaces/' + encodeURIComponent($scope.data.id.replace(/\.intf$/, '.js')));
                        $timeout(function() { $compile(element)($scope); }, 5000);
                        $scope.$on('$destroy', function () {
                            document.body.removeChild(self.s);
                        });
                    }

                };
            },
            replace: true
        };
    }]);

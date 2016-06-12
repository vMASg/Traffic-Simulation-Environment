angular.module('trafficEnv')
    .directive('tabType', ['$parse', '$compile', function($parse, $compile) {
        return {
            compile: function compile(tElement, tAttrs) {
                var directiveGetter = $parse(tAttrs.tabType);
                return function postLink(scope, element) {
                    element.removeAttr('data-tab-type');

                    var directive = directiveGetter(scope);
                    element.attr(directive + '-tab', '');

                    $compile(element)(scope);
                };
            },
            replace: true
        };
    }]);

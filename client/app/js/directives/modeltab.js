angular.module('trafficEnv')
    .directive('modelTab', function(){
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'modelServices', function($scope, modelServices) {
                $scope.aceOption = {
                    mode: 'python',
                    theme: 'monokai',
                    showPrintMargin: false,
                    onLoad: function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/python");
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                    }
                };

                $scope.code = '';
                $scope.scriptResult = '';

                $scope.runImmediate = function () {
                    modelServices.runImmediateScript($scope.data.id, $scope.code).then(function (data) {
                        $scope.scriptResult = data.data.output;
                    });
                };
            }],
            templateUrl: 'templates/model-tab.html'
        };
    });

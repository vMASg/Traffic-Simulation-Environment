angular.module('trafficEnv', ['treeControl', 'ui.ace', 'APIServices'])

    .directive('panelBrowser', function() {
        return {
            controller: ['$scope', 'scriptServices', function($scope, scriptServices) {

                // // TODO add API Call
                // $scope.scriptsDirectories = [
                //     { "name": "Scripts", "type": "dir", "children": [
                //         { "name": "mainscript.py", "type": "code"},
                //         { "name": "secondscript.py", "type": "code"}
                //     ]}
                // ];
                $scope.scriptsDirectories = [];
                scriptServices.getScriptCollection().then(function (data) {
                    $scope.scriptsDirectories = data.data;
                });

                $scope.treeOptions = {
                    nodeChildren: "children",
                    dirSelectable: false,
                    allowDeselect: false
                };

                this.selectListener = function (fun) {
                    $scope.select = fun;
                };
            }],
        };
    })

    .directive('tabSet', function() {
        return {
            scope: {},
            controller: ['$scope', function($scope) {
                $scope.tabset = [];

                $scope.switchTab = function (tab) {
                    if (tab.isActive) return;
                    $scope.tabset.forEach(function (tab) {
                        tab.isActive = false;
                    });
                    tab.isActive = true;
                };

                $scope.openTab = function (elem) {
                    $scope.tabset.forEach(function (tab) {
                        tab.isActive = false;
                    });

                    ntab = angular.copy(elem);
                    ntab.isActive = true;

                    $scope.tabset.push(ntab);
                };

                $scope.openOrSwitchTab = function (elem) {
                    tab = $scope.tabset.find(function (tab) {
                        return tab.name == elem.name;
                    });

                    if (tab) {
                        $scope.switchTab(tab);
                    } else {
                        $scope.openTab(elem);
                    }
                };

                $scope.closeTab = function (index) {
                    delete $scope.tabset.splice(index, 1)[0];
                    var len = $scope.tabset.length;
                    if (len > 0) {
                        $scope.switchTab($scope.tabset[Math.min(index, len - 1)]);
                    }
                };
            }],
            require: '^panelBrowser',
            templateUrl: 'templates/tab-set.html',
            replace: true,
            // transclude: true,
            link: function($scope, iElm, iAttrs, panelBrowserCtrl) {
                this.selectTab = function (elem) {
                    $scope.openOrSwitchTab(elem);
                };
                panelBrowserCtrl.selectListener(this.selectTab);
            }
        };
    })

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
    }])

    .directive('codeTab', function() {
        return {
            scope: {
                'data': '=tabData'
            },
            controller: ['$scope', 'scriptServices', function($scope, scriptServices) {
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
                scriptServices.getScript($scope.data.id).then(function (code) {
                    $scope.code = code.data;
                });

                $scope.saveScript = function () {
                    scriptServices.updateScript($scope.data.id, $scope.code);
                };
            }],
            templateUrl: 'templates/code-tab.html',
            // replace: true
        };
    });

angular.module('trafficEnv', ['treeControl', 'ui.ace'])

    .directive('panelBrowser', function() {
        return {
            controller: ['$scope', function($scope) {

                // TODO add API Call
                $scope.scriptsDirectories = [
                    { "name": "Scripts", "type": "dir", "children": [
                        { "name": "mainscript.py", "type": "code"},
                        { "name": "secondscript.py", "type": "code"}
                    ]}
                ];

                $scope.treeOptions = {
                    nodeChildren: "children",
                    dirSelectable: false,
                    allowDeselect: false
                };

                $scope.select = function (elem) {
                    // body...
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

                    $scope.tabset.push({
                        name: elem.name,
                        isActive: true,
                        type: elem.type
                    });
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
            controller: ['$scope', function($scope) {
                $scope.aceOption = {
                    mode: 'python',
                    theme: 'monokai',
                    onLoad: function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/python");
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                    }
                };
            }],
            templateUrl: 'templates/code-tab.html',
            // replace: true
        };
    });

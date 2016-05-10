angular.module('trafficEnv', ['treeControl', 'ui.ace', 'APIServices', 'ui.bootstrap'])

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
                    allowDeselect: false,
                    equality: function (a, b) {
                        return a === b || (a && b && !(a.id && !b.id || b.id && !a.id) && ((a.id && b.id && a.id === b.id) || !(a.id && b.id) && a.name === b.name));
                    }
                };

                this.selectListener = function (fun) {
                    $scope.select = fun;
                };

                this.changeSelected = function (selected) {
                    $scope.selectedNode = selected;
                };
            }],
        };
    })

    .directive('tabSet', function() {
        return {
            scope: {},
            controller: ['$scope', function($scope) {
                $scope.tabset = [];

                $scope.switchTab = function (tab, changeSelected) {
                    if (tab.isActive) return;
                    $scope.tabset.forEach(function (tab) {
                        tab.isActive = false;
                    });
                    tab.isActive = true;

                    if (changeSelected) {
                        $scope.changeSelected(tab);
                    }
                };

                $scope.openTab = function (elem, changeSelected) {
                    $scope.tabset.forEach(function (tab) {
                        tab.isActive = false;
                    });

                    ntab = angular.copy(elem);
                    ntab.isActive = true;

                    $scope.tabset.push(ntab);

                    if (changeSelected) {
                        $scope.changeSelected(ntab);
                    }
                };

                $scope.openOrSwitchTab = function (elem) {
                    tab = $scope.tabset.find(function (tab) {
                        return tab.id == elem.id;
                    });

                    if (tab) {
                        $scope.switchTab(tab, false);
                    } else {
                        $scope.openTab(elem, false);
                    }
                };

                $scope.closeTab = function (index) {
                    delete $scope.tabset.splice(index, 1)[0];
                    var len = $scope.tabset.length;
                    if (len > 0) {
                        $scope.switchTab($scope.tabset[Math.min(index, len - 1)], true);
                    } else {
                        $scope.changeSelected(null);
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

                $scope.changeSelected = function (elem) {
                    panelBrowserCtrl.changeSelected(elem);
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
            controller: ['$scope', 'scriptServices', '$uibModal', function($scope, scriptServices, $uibModal) {
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
                    $scope.code = code.data.replace(/\r/gm, '');
                });

                $scope.saveScript = function () {
                    scriptServices.updateScript($scope.data.id, $scope.code.replace(/\r\r/gm, '\r'));
                };

                $scope.saveScriptAs = function () {
                    var modalInstance = $uibModal.open({
                        animate: true,
                        templateUrl: 'saveAsModal.html',
                        scope: $scope
                    });

                    modalInstance.result.then(function (name) {
                        scriptServices.saveScript(name, $scope.code.replace(/\r\r/gm, '\r'));
                    });
                };
            }],
            templateUrl: 'templates/code-tab.html',
            // replace: true
        };
    });

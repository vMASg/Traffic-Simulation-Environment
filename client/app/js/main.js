angular.module('trafficEnv', ['treeControl', 'ui.ace', 'APIServices', 'ui.bootstrap', 'btford.socket-io'])

    .factory('socket', ['socketFactory', function(socketFactory){
        return socketFactory({
            prefix: 'event-',
            ioSocket: io.connect('/subscription')
        });
    }])

    .directive('panelBrowser', function() {
        return {
            controller: ['$scope', 'scriptServices', 'modelServices', 'socket',
            function($scope, scriptServices, modelServices, socket) {

                // // TODO add API Call
                // $scope.scriptsDirectories = [
                //     { "name": "Scripts", "type": "dir", "children": [
                //         { "name": "mainscript.py", "type": "code"},
                //         { "name": "secondscript.py", "type": "code"}
                //     ]}
                // ];
                $scope.treeFiles = [];

                scriptServices.getScriptCollection().then(function (data) {
                    var scriptsDirectories = data.data;
                    modelServices.getModelCollection().then(function (data) {
                        var modelsDirectories = [
                            {name: 'Models', type: 'dir', children: data.data}
                        ];
                        $scope.treeFiles = scriptsDirectories.concat(modelsDirectories);
                    });
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

                socket.on('msg', function (data) {
                    console.log(data);
                });

                socket.on('new_script', function (data) {
                    console.log(data);
                    var addNewElement = function (currentNode, where, tab) {
                        if (where.length > 0) {
                            var name = where[0];
                            for (var i = 0; i < currentNode.length; ++i) {
                                if (currentNode[i].name == name) {
                                    where.shift();
                                    addNewElement(currentNode[i].children, where, tab);
                                    break;
                                }
                            }
                        } else {
                            currentNode.push(tab);
                            currentNode.sort(function (a,b) {
                                return a.name.localeCompare(b.name);
                            });
                        }
                    };
                    var name = $scope.scriptsDirectories[0].name;
                    var where = data.id.slice(data.id.indexOf(name)+name.length+1).split('\\');
                    where.pop();
                    addNewElement($scope.scriptsDirectories[0].children, where, data);
                });
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
                    var wasActive = $scope.tabset[index].isActive;
                    delete $scope.tabset.splice(index, 1)[0];
                    var len = $scope.tabset.length;
                    if (wasActive) {
                        if (len > 0) {
                            $scope.switchTab($scope.tabset[Math.min(index, len - 1)], true);
                        } else {
                            $scope.changeSelected(null);
                        }
                    }
                };

                $scope.switchNew = function (ntab) {
                    var index, len = $scope.tabset.length;
                    for (var i = 0; i < len; ++i) {
                        if ($scope.tabset[i].isActive) {
                            index = i;
                        }
                        $scope.tabset[i].isActive = false;
                    }
                    delete $scope.tabset[index];
                    ntab.isActive = true;
                    $scope.tabset[index] = ntab;
                    $scope.changeSelected(ntab);
                };

                $scope.newTab = function () {
                    $scope.tabset.forEach(function (tab) {
                        tab.isActive = false;
                    });
                    $scope.tabset.push({
                        name: 'untitled',
                        type: 'code',
                        isActive: true
                    });
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
                'data': '=tabData',
                'switchNew': '&'
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
                if ($scope.data.id) {
                    scriptServices.getScript($scope.data.id).then(function (code) {
                        $scope.code = code.data.replace(/\r/gm, '');
                    });
                }

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
                        scriptServices.saveScript(name, $scope.code.replace(/\r\r/gm, '\r')).then(function (data) {
                            $scope.switchNew({ntab: {
                                id: data.data.id,
                                name: data.data.name,
                                type: data.data.type
                            }});
                        });
                    });
                };
            }],
            templateUrl: 'templates/code-tab.html',
            // replace: true
        };
    })

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

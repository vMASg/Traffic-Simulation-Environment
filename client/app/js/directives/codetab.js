angular.module('trafficEnv')
    .directive('codeTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'scriptServices', '$uibModal', 'socket', function($scope, scriptServices, $uibModal, socket) {
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
                    var socketIOAdapter = new SocketIOFirebase(socket, $scope.data.id);
                    socketIOAdapter.initRoom();
                    $scope.aceOption.onLoad = function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/python");
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                        Firepad.fromACE(socketIOAdapter, _ace);
                    };
                }

                $scope.saveScript = function () {
                    scriptServices.updateScript($scope.data.id, $scope.code.replace(/\r\r/gm, '\r'));
                };

                $scope.saveScriptAs = function () {
                    scriptServices.getScriptCollection().then(function (data) {
                        $scope.treeDirs = data.data;
                        $scope.selectedNode = data.data[0];
                    });

                    $scope.treeOptions = {
                        nodeChildren: "children",
                        dirSelectable: true,
                        allowDeselect: false,
                        equality: function (a, b) {
                            // return a === b || (a && b && !(a.id && !b.id || b.id && !a.id) && ((a.id && b.id && a.id === b.id) || !(a.id && b.id) && a.name === b.name));
                            return a.id === b.id && a.name === b.name;
                        },
                        isLeaf: function (a) {
                            if (!a.children) return true;
                            for (var i = 0; i < a.children.length; ++i) {
                                if (a.children[i].children) return false;
                            }
                            return true;
                        }
                    };

                    $scope.onlyDirs = function (a) {
                        return a.children;
                    };

                    var modalInstance = $uibModal.open({
                        animate: true,
                        templateUrl: 'templates/saveas-modal.html',
                        scope: $scope
                    });

                    modalInstance.result.then(function (info) {
                        var location = info[0], name = info[1];
                        scriptServices.saveScript(name, location, $scope.code.replace(/\r\r/gm, '\r')).then(function (data) {
                            $scope.switchNew({ntab: {
                                id: data.data.id,
                                name: data.data.name,
                                type: data.data.type
                            }});
                        });
                    });
                };

                $scope.deleteScript = function () {
                    var modalInstance = $uibModal.open({
                        animate: true,
                        templateUrl: 'templates/delete-modal.html',
                        scope: $scope
                    });

                    modalInstance.result.then(function () {
                        scriptServices.deleteScript($scope.data.id);
                    });
                };
            }],
            templateUrl: 'templates/code-tab.html',
            // replace: true
        };
    });

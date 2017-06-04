angular.module('trafficEnv')
    .directive('intcodeTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'interfaceServices', '$uibModal', 'socket', function($scope, interfaceServices, $uibModal, socket) {

                var selectMode = function (extension) {
                    switch (extension) {
                        case 'js':
                            return 'javascript';
                        default:
                            return extension;
                    }
                };

                var mode = 'html';

                $scope.aceOption = {
                    mode: mode,
                    theme: 'monokai',
                    showPrintMargin: false,
                    onLoad: function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/" + mode);
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                    }
                };

                $scope.code = '';
                if ($scope.data.id) {
                    mode = selectMode($scope.data.id.slice($scope.data.id.lastIndexOf('.') + 1));
                    $scope.aceOption.mode = mode;
                    var roomName = $scope.data.id;
                    var socketIOAdapter = new SocketIOFirebase(socket, roomName);
                    socketIOAdapter.initRoom();
                    interfaceServices.getInterface($scope.data.id).then(function (code) {
                        // $scope.code = code.data.replace(/\r/gm, '');
                        var localInstance = Firepad.fromACE(socketIOAdapter, $scope._ace, {
                            defaultText: code.data.replace(/\r/gm, '')
                        });
                    });
                    $scope.aceOption.onLoad = function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/" + mode);
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                        $scope._ace = _ace;
                    };
                    $scope.$on('$destroy', function () {
                        socket.emit('unsubscribe', {channel: roomName});
                    });
                } else {
                    $scope.code = [
                        "<div data-ng-controller='MyCtrl'>",
                        "    ",
                        "</div>"
                    ].join('\n');
                }

                $scope.saveInterface = function () {
                    interfaceServices.updateInterface($scope.data.id, $scope.code.replace(/\r\r/gm, '\r'));
                };

                $scope.saveInterfaceAs = function () {
                    interfaceServices.getInterfaceCollection().then(function (data) {
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

                    $scope.newFolder = function (selectedNode, foldername) {
                        selectedNode.children.push({
                            path: selectedNode.path=='.'?foldername:selectedNode.path + '/' + foldername,
                            name: foldername,
                            type: 'dir',
                            children: []
                        });
                    };

                    modalInstance.result.then(function (info) {
                        var location = info[0], name = info[1];
                        interfaceServices.saveInterface(name, location, $scope.code.replace(/\r\r/gm, '\r')).then(function (data) {
                            $scope.switchNew({ntab: {
                                id: data.data.id,
                                name: data.data.name,
                                type: data.data.type
                            }});
                        });
                    });
                };

                $scope.deleteInterface = function () {
                    var modalInstance = $uibModal.open({
                        animate: true,
                        templateUrl: 'templates/delete-modal.html',
                        scope: $scope
                    });

                    modalInstance.result.then(function () {
                        interfaceServices.deleteInterface($scope.data.id);
                        $scope.data.id = undefined;
                    });
                };
            }],
            templateUrl: 'templates/intcode-tab.html',
            // replace: true
        };
    });

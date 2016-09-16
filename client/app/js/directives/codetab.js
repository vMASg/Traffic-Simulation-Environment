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
                    var roomName = $scope.data.id;
                    var socketIOAdapter = new SocketIOFirebase(socket, roomName);
                    var onChangedScript = function (data) {
                        var id = data.id;
                        if ($scope.data.id == id) {
                            scriptServices.getScript($scope.data.id, ['hash']).then(function (response) {
                                var latestVersion = !$scope.currentHash || $scope.currentHash == $scope.hashes[0];
                                $scope.hashes = response.data.hash;
                                if (latestVersion) {
                                    $scope.currentHash = response.data.hash[0];
                                }
                            });
                        }
                    };
                    socketIOAdapter.initRoom();

                    scriptServices.getScript($scope.data.id).then(function (code) {
                        // $scope.code = code.data.replace(/\r/gm, '');
                        var localInstance = Firepad.fromACE(socketIOAdapter, $scope._ace, {
                            defaultText: code.data.replace(/\r/gm, '')
                        });
                    });
                    $scope.oldCodeAceOption = angular.copy($scope.aceOption);

                    $scope.oldCodeAceOption.onLoad = function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/python");
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                        _ace.setReadOnly(true);
                    };

                    $scope.aceOption.onLoad = function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/python");
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                        $scope._ace = _ace;
                    };

                    $scope.$on('$destroy', function () {
                        socket.emit('unsubscribe', {channel: roomName});
                        socket.removeListener('changed_script', onChangedScript);
                    });

                    scriptServices.getScript($scope.data.id, ['hash']).then(function (response) {
                        $scope.hashes = response.data.hash;
                        $scope.currentHash = response.data.hash[0];
                    });
                    socket.on('changed_script', onChangedScript);

                } else {
                    $scope.code = [
                        'from aimsun_scriptreg import return_name, PythonScript, AconsoleScript',
                        '',
                        '# PythonScript class is used for scripts that do not',
                        '# require to call Aimsun Python scripting API.',
                        '# ',
                        '# In case it needs Aimsun, the base class should be',
                        '# replaced by AconsoleScript.',
                        '',
                        'class Script(PythonScript):',
                        '',
                        '    @return_name(\'out1\', \'out2\')',
                        '    def main(self, inp1, inp2):',
                        '        """docstring for method main"""',
                        '',
                        '        print "This will be displayed in the output stream"',
                        '        return inp1, inp2',
                        '',
                        '',
                        'if __name__ == \'__main__\':',
                        '    print Script().main(1, 2)',
                        ''
                    ].join('\n');
                }

                $scope.changeHash = function () {
                    // $scope.currentHash = currentHash;
                    if ($scope.currentHash != $scope.hashes[0]) {
                        scriptServices.getScript($scope.data.id, $scope.currentHash).then(function (code) {
                            $scope.oldCode = code.data.replace(/\r/gm, '');
                        });
                    }
                };

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

                    $scope.newFolder = function (selectedNode, foldername) {
                        selectedNode.children.push({
                            id: selectedNode.id=='.'?foldername:selectedNode.id + '\\' + foldername,
                            name: foldername,
                            type: 'dir',
                            children: []
                        });
                    };

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

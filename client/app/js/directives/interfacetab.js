angular.module('trafficEnv')
    .directive('interfaceTab', function() {
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            controller: ['$scope', 'interfaceServices', '$uibModal', 'socket', '$q', '$element', function($scope, interfaceServices, $uibModal, socket, $q, $element) {
                function BaseOption(params) {
                    // mode: will be set by inheriting children,
                    this.mode = params.mode;
                    this.index = params.index;
                    this.readonly = params.readonly;

                    this.theme = 'monokai';
                    this.showPrintMargin = false;
                    this.onLoadHelper = function (_ace) {
                        // HACK to have the ace instance in the scope...
                        $scope.modeChanged = function (_ace) {
                            _ace.getSession().setMode("ace/mode/" + this.mode);
                        };
                        _ace.setOption('scrollPastEnd', 0.9);
                        _ace.$blockScrolling = Infinity;
                        _ace.setHighlightActiveLine(false);
                        if ($scope.data.id && this.index !== undefined) {
                            $scope._aces[this.index] = _ace;
                            acesd[this.index].resolve();
                        }
                        if (this.readonly) {
                            _ace.setReadOnly(true);
                        }
                    };

                    this.onLoad = this.onLoadHelper.bind(this);
                }

                // TODO find better way to inherit from baseOption (angular.copy/extend?)
                $scope.aceOptions = [
                    new BaseOption({mode: 'html',       index: 0}),
                    new BaseOption({mode: 'javascript', index: 1}),
                    new BaseOption({mode: 'css',        index: 2})
                ];

                $scope.code = ['', '', ''];
                $scope.oldCode = ['', '', ''];

                $scope.visibleEditor = 0;

                if ($scope.data.id) {
                    var roomName = $scope.data.id;
                    var socketIOAdapters = [
                        new SocketIOFirebase(socket, roomName + '0'),
                        new SocketIOFirebase(socket, roomName + '1'),
                        new SocketIOFirebase(socket, roomName + '2')
                    ];
                    var onChangedInterface = function (data) {
                        var id = data.id;
                        if ($scope.data.id == id) {
                            interfaceServices.getInterface($scope.data.id, ['hash']).then(function (response) {
                                var latestVersion = !$scope.currentHash || $scope.currentHash == $scope.hashes[0];
                                $scope.hashes = response.data.hash;
                                if (latestVersion) {
                                    $scope.currentHash = response.data.hash[0];
                                }
                            });
                        }
                    };

                    socketIOAdapters[0].initRoom();
                    socketIOAdapters[1].initRoom();
                    socketIOAdapters[2].initRoom();

                    $scope._aces = new Array(3);
                    var acesd = [$q.defer(), $q.defer(), $q.defer()];
                    $scope.oldCodeAceOptions = [
                        new BaseOption({mode: 'html',       readonly: true}),
                        new BaseOption({mode: 'javascript', readonly: true}),
                        new BaseOption({mode: 'css',        readonly: true})
                    ];

                    interfaceServices.getInterface($scope.data.id).then(function (response) {
                        // $scope.code = code.data.replace(/\r/gm, '');
                        $q.all(acesd.map(d => d.promise)).then(function () {
                            var code = response.data;
                            Firepad.fromACE(socketIOAdapters[0], $scope._aces[0], { defaultText: code['html'].replace(/\r/gm, '') });
                            Firepad.fromACE(socketIOAdapters[1], $scope._aces[1], { defaultText: code['js']  .replace(/\r/gm, '') });
                            Firepad.fromACE(socketIOAdapters[2], $scope._aces[2], { defaultText: code['css'] .replace(/\r/gm, '') });
                        });
                    });

                    $scope.$on('$destroy', function () {
                        socket.emit('unsubscribe', {channel: roomName + '0'});
                        socket.emit('unsubscribe', {channel: roomName + '1'});
                        socket.emit('unsubscribe', {channel: roomName + '2'});
                        socket.removeListener('changed_interface', onChangedInterface);
                    });

                    interfaceServices.getInterface($scope.data.id, ['hash']).then(function (response) {
                        $scope.hashes = response.data.hash;
                        $scope.currentHash = response.data.hash[0];
                    });
                    socket.on('changed_interface', onChangedInterface);

                } else {
                    $scope.code[0] = [
                        "<div data-ng-controller='MyCtrl'>",
                        "    ",
                        "</div>"
                    ].join('\n');

                    $scope.code[1] = [
                        "angular.module('trafficEnv')",
                        ".controller('MyCtrl', function($scope){",
                        "    // TODO",
                        "});"
                    ].join('\n');
                }

                $scope.changeHash = function () {
                    // $scope.currentHash = currentHash;
                    if ($scope.currentHash != $scope.hashes[0]) {
                        interfaceServices.getInterface($scope.data.id, $scope.currentHash).then(function (response) {
                            var code = response.data;
                            $scope.oldCode = [
                                code['html'].replace(/\r/gm, ''),
                                code['js']  .replace(/\r/gm, ''),
                                code['css'] .replace(/\r/gm, '')
                            ];
                        });
                    }
                };

                $scope.saveInterface = function () {
                    interfaceServices.updateInterface($scope.data.id, {
                        html: $scope.code[0].replace(/\r\r/gm, '\r'),
                        js: $scope.code[1].replace(/\r\r/gm, '\r'),
                        css: $scope.code[2].replace(/\r\r/gm, '\r')
                    });
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
                            return a.id === b.id && a.path === b.path;
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
                        interfaceServices.saveInterface(name, location, {
                            html: $scope.code[0].replace(/\r\r/gm, '\r'),
                            js: $scope.code[1].replace(/\r\r/gm, '\r'),
                            css: $scope.code[2].replace(/\r\r/gm, '\r')
                        }).then(function (data) {
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

                $scope.$watch('visibleEditor', function (newValue, oldValue) {
                    if (newValue == 3) {
                        var iframe = $element[0].getElementsByTagName('iframe')[0];
                        console.log(iframe);
                    }
                });

            }],
            templateUrl: 'templates/interface-tab.html',
            // replace: true
        };
    });

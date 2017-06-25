angular.module('trafficEnv')
    .directive('panelBrowser', function() {
        return {
            controller: ['$scope', 'scriptServices', 'modelServices', 'pipelineServices', 'interfaceServices', '$q', 'socket',
            function($scope, scriptServices, modelServices, pipelineServices, interfaceServices, $q, socket) {

                // // TODO add API Call
                // $scope.scriptsDirectories = [
                //     { "name": "Scripts", "type": "dir", "children": [
                //         { "name": "mainscript.py", "type": "code"},
                //         { "name": "secondscript.py", "type": "code"}
                //     ]}
                // ];
                $scope.treeFiles = [];
                $scope.expandedNodes = [];

                var scripts_deferred = $q.defer();
                var models_deferred = $q.defer();
                var pipelines_deferred = $q.defer();
                var interfaces_deferred = $q.defer();

                var all_deferred = $q.all([
                    scripts_deferred.promise,
                    models_deferred.promise,
                    pipelines_deferred.promise,
                    interfaces_deferred.promise
                ]);

                all_deferred.then(function (all_data) {
                    var scriptsDirectories    = all_data[0].data;
                    var modelsDirectories     = all_data[1].data;
                    var pipelinesDirectories  = all_data[2].data;
                    var interfacesDirectories = all_data[3].data;

                    $scope.expandedNodes = [
                        scriptsDirectories[0],
                        modelsDirectories[0],
                        pipelinesDirectories[0],
                        interfacesDirectories[0]
                    ];

                    $scope.treeFiles = scriptsDirectories
                        .concat(modelsDirectories)
                        .concat(pipelinesDirectories)
                        .concat(interfacesDirectories);
                });

                scriptServices.getScriptCollection()       .then( scripts_deferred.resolve );
                modelServices.getModelCollection()         .then( models_deferred.resolve );
                pipelineServices.getPipelineCollection()   .then( pipelines_deferred.resolve );
                interfaceServices.getInterfaceCollection() .then( interfaces_deferred.resolve );

                $scope.treeOptions = {
                    nodeChildren: "children",
                    dirSelectable: false,
                    allowDeselect: false,
                    equality: function (a, b) {
                        // return a === b || (a && b && !(a.id && !b.id || b.id && !a.id) && ((a.id && b.id && a.id === b.id) || !(a.id && b.id) && a.name === b.name));
                        return a && b && a.id === b.id && a.name === b.name;
                    }
                };

                this.selectListener = function (fun) {
                    $scope.select = fun;
                };

                this.deleteListener = function (fun) {
                    $scope.deleteTab = fun;
                };

                this.changeSelected = function (selected) {
                    $scope.selectedNode = selected;
                };

                socket.on('connect', function (data) {
                    console.log(data);
                });

                socket.on('new_script', function (data) {
                    // console.log(data);
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
                            if (i == currentNode.length) {
                                // TODO create folders
                                var accum = tab.id.slice(0, tab.id.indexOf('/', tab.id.indexOf(name)));
                                var newFolder = {name: name, id: accum, type: 'dir', children: []};
                                where.shift();
                                addNewElement(newFolder.children, where, tab);
                                currentNode.push(newFolder);
                                currentNode.sort(function (a,b) {
                                    return a.name.localeCompare(b.name);
                                });
                            }
                        } else {
                            currentNode.push(tab);
                            currentNode.sort(function (a,b) {
                                return a.name.localeCompare(b.name);
                            });
                        }
                    };
                    var where = data.id.split('/');
                    where.pop();
                    addNewElement($scope.treeFiles[0].children, where, data);
                });

                socket.on('deleted_script', function (data) {
                    var deleteScript = function (currentNode, where, id) {
                        if (where.length > 0) {
                            var name = where[0];
                            for (var i = 0; i < currentNode.length; ++i) {
                                if (currentNode[i].name == name) {
                                    where.shift();
                                    deleteScript(currentNode[i].children, where, id);
                                    if (currentNode[i].children.length == 0) {
                                        delete currentNode.splice(i, 1)[0];
                                    }
                                    break;
                                }
                            }
                        } else {
                            for (var i = 0; i < currentNode.length; ++i) {
                                if (currentNode[i].id == id) {
                                    break;
                                }
                            }
                            var tab = currentNode.splice(i, 1)[0];
                            tab.id = undefined;
                        }
                    };
                    var id = data.id;
                    var where = id.split('/');
                    where.pop();
                    deleteScript($scope.treeFiles[0].children, where, id);
                    $scope.deleteTab(id);
                });

                socket.on('new_model', function (data) {
                    $scope.treeFiles[1].children.push(data);
                    $scope.treeFiles[1].children.sort(function (a,b) {
                        return a.name.localeCompare(b.name);
                    });
                });

                socket.on('new_pipeline', function (data) {
                    // console.log(data);
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
                            if (i == currentNode.length) {
                                // TODO create folders
                                var accum = tab.id.slice(0, tab.id.indexOf('/', tab.id.indexOf(name)));
                                var newFolder = {name: name, id: accum, type: 'dir', children: []};
                                where.shift();
                                addNewElement(newFolder.children, where, tab);
                                currentNode.push(newFolder);
                                currentNode.sort(function (a,b) {
                                    return a.name.localeCompare(b.name);
                                });
                            }
                        } else {
                            currentNode.push(tab);
                            currentNode.sort(function (a,b) {
                                return a.name.localeCompare(b.name);
                            });
                        }
                    };
                    var where = data.id.split('/');
                    where.pop();
                    addNewElement($scope.treeFiles[2].children, where, data);
                });

                socket.on('deleted_pipeline', function (data) {
                    var deletePipeline = function (currentNode, where, id) {
                        if (where.length > 0) {
                            var name = where[0];
                            for (var i = 0; i < currentNode.length; ++i) {
                                if (currentNode[i].name == name) {
                                    where.shift();
                                    deletePipeline(currentNode[i].children, where, id);
                                    if (currentNode[i].children.length == 0) {
                                        delete currentNode.splice(i, 1)[0];
                                    }
                                    break;
                                }
                            }
                        } else {
                            for (var i = 0; i < currentNode.length; ++i) {
                                if (currentNode[i].id == id) {
                                    break;
                                }
                            }
                            var tab = currentNode.splice(i, 1)[0];
                            tab.id = undefined;
                        }
                    };
                    var id = data.id;
                    var where = id.split('/');
                    where.pop();
                    deletePipeline($scope.treeFiles[2].children, where, id);
                    $scope.deleteTab(id);
                });

                socket.on('new_interface', function (data) {
                    // console.log(data);
                    // var addNewElement = function (currentNode, where, tab) {
                    //     if (where.length > 0) {
                    //         var name = where[0];
                    //         for (var i = 0; i < currentNode.length; ++i) {
                    //             if (currentNode[i].name == name) {
                    //                 where.shift();
                    //                 addNewElement(currentNode[i].children, where, tab);
                    //                 break;
                    //             }
                    //         }
                    //         if (i == currentNode.length) {
                    //             // TODO create folders
                    //             var accum = tab.id.slice(0, tab.id.indexOf('/', tab.id.indexOf(name)));
                    //             var newFolder = {name: name, id: accum, type: 'dir', children: []};
                    //             where.shift();
                    //             addNewElement(newFolder.children, where, tab);
                    //             currentNode.push(newFolder);
                    //             currentNode.sort(function (a,b) {
                    //                 return a.name.localeCompare(b.name);
                    //             });
                    //         }
                    //     } else {
                    //         currentNode.push(tab);
                    //         currentNode.sort(function (a,b) {
                    //             return a.name.localeCompare(b.name);
                    //         });
                    //     }
                    // };
                    // var where = data.id.split('/');
                    // where.pop();
                    // addNewElement($scope.treeFiles[3].children, where, data);
                    interfaceServices.getInterfaceCollection().then(function (data) {
                        $scope.treeFiles[3]  = data.data[0];
                    });
                });

                socket.on('deleted_interface', function (data) {
                    // var deleteInterface = function (currentNode, where, id) {
                    //     if (where.length > 0) {
                    //         var name = where[0];
                    //         for (var i = 0; i < currentNode.length; ++i) {
                    //             if (currentNode[i].name == name) {
                    //                 where.shift();
                    //                 deleteInterface(currentNode[i].children, where, id);
                    //                 if (currentNode[i].children.length == 0) {
                    //                     delete currentNode.splice(i, 1)[0];
                    //                 }
                    //                 break;
                    //             }
                    //         }
                    //     } else {
                    //         for (var i = 0; i < currentNode.length; ++i) {
                    //             if (currentNode[i].id == id) {
                    //                 break;
                    //             }
                    //         }
                    //         var tab = currentNode.splice(i, 1)[0];
                    //         tab.id = undefined;
                    //     }
                    // };
                    // var id = data.id;
                    // var where = id.split('/');
                    // where.pop();
                    // deleteInterface($scope.treeFiles[3].children, where, id);
                    // $scope.deleteTab(id);
                    interfaceServices.getInterfaceCollection().then(function (data) {
                        $scope.treeFiles[3]  = data.data[0];
                    });
                });

            }],
        };
    });

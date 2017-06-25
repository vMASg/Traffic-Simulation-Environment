angular.module('trafficEnv')
    .directive('panelBrowser', function() {
        return {
            controller: ['$scope', 'scriptServices', 'modelServices', 'pipelineServices', 'interfaceServices', '$q', 'socket',
            function($scope, scriptServices, modelServices, pipelineServices, interfaceServices, $q, socket) {

                var newResource = function (resourceRoot) {
                    return function (data) {
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
                                    // var accum = tab.id.slice(0, tab.id.indexOf('/', tab.id.indexOf(name)));
                                    var newFolder = {name: name, id: null, type: 'dir', children: []};
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
                        var where = data.path.split('/');
                        where.pop();
                        addNewElement(resourceRoot, where, data);
                    };
                };

                var deletedResource = function (resourceRoot) {
                    return function (data) {
                        var deleteScript = function (currentNode, id) {
                            var currentNodeChildren = currentNode.children;
                            for (var i = 0; i < currentNodeChildren.length; ++i) {
                                if (currentNodeChildren[i].id === id) {
                                    var tab = currentNodeChildren.splice(i, 1)[0];
                                    tab.id = undefined;
                                    return true;
                                }
                                else if (currentNodeChildren[i].children && deleteScript(currentNodeChildren[i], id)) {
                                    if (currentNodeChildren[i].children.length == 0) {
                                        delete currentNodeChildren.splice(i, 1)[0];
                                    }
                                    return true;
                                }
                            }
                            return false;
                        };
                        var id = data.id;
                        deleteScript({children: resourceRoot}, id);
                        $scope.deleteTab(id);
                    };
                };

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

                    socket.on('new_script',    newResource($scope.treeFiles[0].children));
                    socket.on('new_model',     newResource($scope.treeFiles[1].children));
                    socket.on('new_pipeline',  newResource($scope.treeFiles[2].children));
                    socket.on('new_interface', newResource($scope.treeFiles[3].children));

                    socket.on('deleted_script',    deletedResource($scope.treeFiles[0].children));
                    socket.on('deleted_model',     deletedResource($scope.treeFiles[1].children));
                    socket.on('deleted_pipeline',  deletedResource($scope.treeFiles[2].children));
                    socket.on('deleted_interface', deletedResource($scope.treeFiles[3].children));
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
                        return a && b && a.id === b.id && a.path === b.path;
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

            }],
        };
    });

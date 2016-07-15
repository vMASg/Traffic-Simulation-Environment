angular.module('trafficEnv')
    .directive('pipelineTab', ['$timeout', 'scriptServices', 'pipelineServices', '$uibModal', function($timeout, scriptServices, pipelineServices, $uibModal){
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            templateUrl: 'templates/pipeline-tab.html',
            link: function($scope, iElm, iAttrs, controller) {
                var element;

                var updateConnection = function (circ, circOrig, pathObj) {
                    var boundingClientRect = circ.getBoundingClientRect();
                    var dtop = boundingClientRect.top, dleft = boundingClientRect.left;
                    var dwidth = boundingClientRect.width, dheight = boundingClientRect.height;
                    dtop -= containerTop;
                    dleft -= containerLeft;

                    var boundingClientRectOrig = circOrig.getBoundingClientRect();
                    var otop = boundingClientRectOrig.top, oleft = boundingClientRectOrig.left;
                    var owidth = boundingClientRectOrig.width, oheight = boundingClientRectOrig.height;
                    otop -= containerTop;
                    oleft -= containerLeft;
                    pathObj.attr({path: createPath(oleft + owidth / 2, otop + oheight / 2, dleft + dwidth / 2, dtop + dheight / 2)});
                };

                $scope.mousemove = function (ev) {
                    if (element && element.moving) {
                        var posX = ev.clientX, posY = ev.clientY;
                        var aX = posX - element.diffX, aY = posY - element.diffY;
                        if (aX < 0) aX = 0;
                        if (aY < 0) aY = 0;
                        if (aX + element.ew > containerWidth) aX = containerWidth - element.ew;
                        if (aY + element.eh > containerHeight) aY = containerHeight - element.eh;
                        element.target.style.left = aX + 'px';
                        element.target.style.top = aY + 'px';
                        element.nodeInfo.x = aX;
                        element.nodeInfo.y = aY;
                        var inputs = element.nodeInfo.inputs;
                        for (var i = inputs.length - 1; i >= 0; i--) {
                            var inp = inputs[i];
                            if (inp.input) {
                                var circ = inp.getCircle();
                                var path = inp.input.pathObj;
                                var circOrig = inp.input.origin.getCircle();
                                updateConnection(circ, circOrig, path);
                            }
                        }
                        var outputs = element.nodeInfo.outputs;
                        for (i = outputs.length - 1; i >= 0; i--) {
                            var out = outputs[i];
                            if (out.connections) {
                                var circOrig = out.getCircle();
                                for (var j = out.connections.length - 1; j >= 0; j--) {
                                    var connection = out.connections[j];
                                    var path = connection.pathObj;
                                    var circ = connection.destination.getCircle();
                                    updateConnection(circ, circOrig, path);
                                }
                            }
                        }
                        var predecessors = element.nodeInfo.predecessors;
                        var circ = predecessors.getCircle();
                        for (var i = predecessors.length - 1; i >= 0; i--) {
                            var inp = predecessors[i];
                            var path = inp.pathObj;
                            var circOrig = inp.origin.successors.getCircle();
                            updateConnection(circ, circOrig, path);
                        }
                        var successors = element.nodeInfo.successors;
                        var circOrig = successors.getCircle();
                        for (var i = successors.length - 1; i >= 0; i--) {
                            var inp = successors[i];
                            var path = inp.pathObj;
                            var circ = inp.destination.predecessors.getCircle();
                            updateConnection(circ, circOrig, path);
                        }
                    }
                };

                $scope.startMoving = function (ev, target, nodeInfo) {
                    // TODO refactor remove target parameter
                    if (!target) target = ev.currentTarget;
                    element = {target: target};
                    var posX = ev.clientX, posY = ev.clientY;
                    var bcr = target.getBoundingClientRect();
                    var top = bcr.top - containerTop, left = bcr.left - containerLeft;
                    var width = bcr.width, height = bcr.height;

                    element.diffX = posX - left;
                    element.diffY = posY - top;
                    element.ew = width;
                    element.eh = height;
                    element.moving = true;
                    element.nodeInfo = nodeInfo;

                    target.classList.add('moving');
                };

                $scope.stopMoving = function (ev) {
                    if (element) {                    
                        element.moving = false;
                        element.target.classList.remove('moving');
                        element = null;
                    }
                    if (startingPath) {
                        startingPath.figure.remove();
                        startingPath = null;
                    }
                    if (endingPath) {
                        endingPath.figure.remove();
                        endingPath = null;
                    }
                    if ($scope.contextOptions.obj) {
                        $scope.contextOptions.obj.isOpen = false;
                        // $scope.contextOptions.obj = null;
                    }
                };

                $scope.maybeStopProp = function ($event) {
                    if (!element) {
                        $event.stopPropagation();
                    }
                };

                var createBox = function (box, nodeInfo, posx, posy) {
                    var circles = box.querySelectorAll('.circle.start');
                    var i;
                    // Ignoring first elements (preceding /succeeding connectors)
                    for (i = circles.length - 1; i >= 1; i--) {
                        var circ = circles[i];
                        var inp = nodeInfo.outputs[i-1];
                        inp.getNode = function() { return nodeInfo; };
                        inp.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                    }
                    nodeInfo.successors.getCircle = (function(circ) { return function() { return circ; }; })(circles[0]);
                    circles = box.querySelectorAll('.circle.end');
                    for (i = circles.length - 1; i >= 1; i--) {
                        var circ = circles[i];
                        var out = nodeInfo.inputs[i-1];
                        out.getNode = function() { return nodeInfo; };
                        out.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                    }
                    nodeInfo.predecessors.getCircle = (function(circ) { return function() { return circ; }; })(circles[0]);
                    var wh = box.getBoundingClientRect();
                    if (posx && posy) {
                        nodeInfo.y = (posy - containerTop - wh.height/2);
                        nodeInfo.x = (posx - containerLeft - wh.width/2);
                    }
                    box.style.top = nodeInfo.y + 'px';
                    box.style.left = nodeInfo.x + 'px';
                    box.style.visibility = 'visible';
                };

                var startingPath;
                $scope.createStartingConnection = function (ev, nodeConnector) {
                    ev.stopPropagation();
                    if (!endingPath && !startingPath) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        startingPath = {
                            x: left + width / 2,
                            y: top + height / 2,
                            figure: paper.path(createPath(left + width / 2, top + height / 2, left + width / 2, top + height / 2)),
                            connectorOut: nodeConnector
                        };
                        startingPath.figure.attr({stroke: '#4E4F4F', 'stroke-width': 2});
                    }
                };

                var endingPath;
                $scope.createEndingConnection = function (ev, nodeConnector) {
                    ev.stopPropagation();
                    if (!startingPath && !endingPath) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        endingPath = {
                            x: left + width / 2,
                            y: top + height / 2,
                            figure: paper.path(createPath(left + width / 2, top + height / 2, left + width / 2, top + height / 2)),
                            connectorIn: nodeConnector
                        };
                        endingPath.figure.attr({stroke: '#4E4F4F', 'stroke-width': 2});
                    }
                };

                $scope.drawpath = function (ev) {
                    var newX = ev.clientX - containerLeft;
                    var newY = ev.clientY - containerTop;
                    var newPath;
                    if (startingPath) {
                        newPath = createPath(startingPath.x, startingPath.y, newX, newY);
                        startingPath.figure.attr({path: newPath});
                    } else if (endingPath) {
                        newPath = createPath(newX, newY, endingPath.x, endingPath.y);
                        endingPath.figure.attr({path: newPath});
                    }
                };

                $scope.finishStartingConnection = function (ev, nodeConnector) {
                    if (startingPath && startingPath.connectorOut && nodeConnector.getNode() !== startingPath.connectorOut.getNode()) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        var newPath = createPath(startingPath.x, startingPath.y, left + width / 2, top + height / 2);
                        startingPath.figure.attr({path: newPath});
                        if (!startingPath.connectorOut.connections) {
                            startingPath.connectorOut.connections = [];
                        }
                        if (!startingPath.connectorOut.connections.find(function (elem) { return elem.destination == nodeConnector; })) {
                            startingPath.connectorOut.connections.push({pathObj: startingPath.figure, destination: nodeConnector});
                            if (nodeConnector.input) {
                                nodeConnector.input.pathObj.remove();
                            }
                            nodeConnector.input = {pathObj: startingPath.figure, origin: startingPath.connectorOut};
                        } else {
                            startingPath.figure.remove();
                        }
                        startingPath = null;
                    }
                };

                $scope.finishEndingConnection = function (ev, nodeConnector) {
                    if (endingPath && endingPath.connectorIn && nodeConnector.getNode() !== endingPath.connectorIn.getNode()) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        var newPath = createPath(left + width / 2, top + height / 2, endingPath.x, endingPath.y);
                        endingPath.figure.attr({path: newPath});
                        if (!nodeConnector.connections) {
                            nodeConnector.connections = [];
                        }
                        if (!nodeConnector.connections.find(function (elem) { return elem.destination == endingPath.connectorIn; })) {
                            nodeConnector.connections.push({pathObj: endingPath.figure, destination: endingPath.connectorIn});
                            if (endingPath.connectorIn.input) {
                                endingPath.connectorIn.input.pathObj.remove();
                            }
                            endingPath.connectorIn.input = {pathObj: endingPath.figure, origin: nodeConnector};
                        } else {
                            endingPath.figure.remove();
                        }
                        endingPath = null;
                    }
                };

                $scope.createPredecessor = function (ev, nodeInfo) {
                    ev.stopPropagation();
                    if (!startingPath && !endingPath) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        endingPath = {
                            x: left + width / 2,
                            y: top + height / 2,
                            figure: paper.path(createPath(left + width / 2, top + height / 2, left + width / 2, top + height / 2)),
                            nodeIn: nodeInfo
                        };
                        endingPath.figure.attr({stroke: '#6C4C13', 'stroke-width': 2, 'stroke-dasharray': '- '});
                    }
                };

                $scope.finishPredecessor = function (ev, nodeInfo) {
                    if (endingPath && endingPath.nodeIn && nodeInfo !== endingPath.nodeIn) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        var newPath = createPath(left + width / 2, top + height / 2, endingPath.x, endingPath.y);
                        endingPath.figure.attr({path: newPath});
                        if (!nodeInfo.successors) {
                            nodeInfo.successors = [];
                        }
                        if (!nodeInfo.successors.find(function (elem) { return elem.destination == endingPath.nodeIn; })) {
                            // Connection does not already exist
                            nodeInfo.successors.push({pathObj: endingPath.figure, destination: endingPath.nodeIn});
                            if (!endingPath.nodeIn.predecessors) {
                                endingPath.nodeIn.predecessors = [];
                            }
                            endingPath.nodeIn.predecessors.push({pathObj: endingPath.figure, origin: nodeInfo});
                        } else {
                            endingPath.figure.remove();
                        }
                        endingPath = null;
                    }
                };

                $scope.createSuccessor = function (ev, nodeInfo) {
                    ev.stopPropagation();
                    if (!endingPath && !startingPath) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        startingPath = {
                            x: left + width / 2,
                            y: top + height / 2,
                            figure: paper.path(createPath(left + width / 2, top + height / 2, left + width / 2, top + height / 2)),
                            nodeOut: nodeInfo
                        };
                        startingPath.figure.attr({stroke: '#6C4C13', 'stroke-width': 2, 'stroke-dasharray': '- '});
                    }
                };

                $scope.finishSuccessor = function (ev, nodeInfo) {
                    if (startingPath && startingPath.nodeOut && nodeInfo !== startingPath.nodeOut) {
                        var element = ev.target;
                        var boundingClientRect = element.getBoundingClientRect();
                        var top = boundingClientRect.top, left = boundingClientRect.left;
                        var width = boundingClientRect.width, height = boundingClientRect.height;
                        top -= containerTop;
                        left -= containerLeft;
                        var newPath = createPath(startingPath.x, startingPath.y, left + width / 2, top + height / 2);
                        startingPath.figure.attr({path: newPath});
                        if (!startingPath.nodeOut.successors) {
                            startingPath.nodeOut.successors = [];
                        }
                        if (!startingPath.nodeOut.successors.find(function (elem) { return elem.destination == nodeInfo; })) {
                            // Connection does not already exist
                            startingPath.nodeOut.successors.push({pathObj: startingPath.figure, destination: nodeInfo});
                            if (!nodeInfo.predecessors) {
                                nodeInfo.predecessors = [];
                            }
                            nodeInfo.predecessors.push({pathObj: startingPath.figure, origin: startingPath.nodeOut});
                        } else {
                            startingPath.figure.remove();
                        }
                        startingPath = null;
                    }
                };

                var createPath = function (x1, y1, x4, y4) {
                    // Taken from https://github.com/idflood/ThreeNodes.js/blob/master/src/scripts/threenodes/connections/views/ConnectionView.coffee line47 (commit a1163e1)
                    var min_diff = 42;
                    var diffx = Math.max(min_diff, x4 - x1);
                    var diffy = Math.max(min_diff, y4 - y1);

                    var x2 = x1 + diffx * 0.5;
                    var y2 = y1;
                    var x3 = x4 - diffx * 0.5;
                    var y3 = y4;

                    return [["M", x1.toFixed(3), y1.toFixed(3)], ["C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)]];
                };

                var transformOutputGraph = function (graph) {
                    return graph.map(function(e) {
                        return {
                            id: e.id,
                            path: e.path,
                            title: e.title,
                            x: e.x,
                            y: e.y,
                            inputs: e.inputs.map(function (input) {
                                return {
                                    name: input.name,
                                    origin: input.input?{ node: input.input.origin.getNode().id, connector: input.input.origin.name }:null
                                };
                            }),
                            outputs: e.outputs.map(function (output) {
                                return {
                                    name: output.name,
                                    connections: output.connections?output.connections.map(function (conn) {
                                        return {
                                            node: conn.destination.getNode().id,
                                            connector: conn.destination.name
                                        };
                                    }):[]
                                };
                            }),
                            predecessors: e.predecessors.map(function (pred) {
                                return {
                                    origin: pred.origin.id
                                };
                            }),
                            successors: e.successors.map(function (succ) {
                                return {
                                    destination: succ.destination.id
                                };
                            })
                        };
                    });
                };

                // TODO read http://stackoverflow.com/questions/24167460/how-do-i-get-the-x-and-y-positions-of-an-element-in-an-angularjs-directive
                var nodes = iElm[0].children[1].children[1];
                var recomputeContainer = function () {
                    var boundingClientRect = nodes.getBoundingClientRect();
                    containerWidth = boundingClientRect.width;
                    containerHeight = boundingClientRect.height;
                    containerLeft = boundingClientRect.left;
                    containerTop = boundingClientRect.top;
                };

                var boundingClientRect = nodes.getBoundingClientRect();
                var containerWidth = boundingClientRect.width;
                var containerHeight = boundingClientRect.height;
                var containerLeft = boundingClientRect.left;
                var containerTop = boundingClientRect.top;
                var paper = Raphael(iElm[0].children[1].children[0]);

                var nodeIdCounter = 0;
                $scope.dropHandler = function ($event, $data) {
                    scriptServices.getScript($data, ['name', 'inout', 'path']).then(function (response) {
                        var nodeInfo = {
                            id: nodeIdCounter++,  // TODO replace by proper random id
                            path: response.data.path,
                            title: response.data.name,
                            inputs: (response.data.inout[0] || []).map(function (a) { return {name: a}; }),
                            outputs: (response.data.inout[1] || []).map(function (a) { return {name: a}; }),
                            predecessors: [],
                            successors: []
                        };
                        $scope.shapes.push(nodeInfo);
                        $timeout(function(){
                            var nodeboxes = nodes.querySelectorAll('.node-box');
                            createBox(nodeboxes[nodeboxes.length-1], nodeInfo, $event.clientX, $event.clientY);
                        }, 5);
                    });
                };

                $scope.savePipelineAs = function () {
                    pipelineServices.getPipelineCollection().then(function (data) {
                        $scope.treeDirs = data.data;
                        $scope.selectedNode = data.data[0];
                    });

                    $scope.treeOptions = {
                        nodeChildren: "children",
                        dirSelectable: true,
                        allowDeselect: false,
                        equality: function (a, b) {
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
                        pipelineServices.savePipeline(name, location, transformOutputGraph($scope.shapes)).then(function (data) {
                            $scope.switchNew({ntab: {
                                id: data.data.id,
                                name: data.data.name,
                                type: data.data.type
                            }});
                        });
                    });
                };

                $scope.savePipeline = function () {
                    pipelineServices.updatePipeline($scope.data.id, transformOutputGraph($scope.shapes));
                };

                $scope.deletePipeline = function () {
                    var modalInstance = $uibModal.open({
                        animate: true,
                        templateUrl: 'templates/delete-modal.html',
                        scope: $scope
                    });

                    modalInstance.result.then(function () {
                        pipelineServices.deletePipeline($scope.data.id);
                    });
                };

                $scope.runPipeline = function () {
                    pipelineServices.runPipeline($scope.data.id);
                };

                $scope.shapes = [];
                $scope.min = Math.min;
                // $scope.openContextMenu = function ($event, nodeInfo) {
                //     $event.preventDefault();
                //     $event.stopPropagation();
                //     nodeInfo.optionsOpen = !nodeInfo.optionsOpen;
                //     $scope.pipelineNode.nodeInfo = nodeInfo;
                // };

                // $scope.pipelineNode = {
                //     template: 'nodeOptions.html',
                //     nodeInfo: null,
                //     addPrecedingConnector: function () {
                //         $scope.pipelineNode.nodeInfo.inputs.unshift({name: 'pre', origin: null});
                //     }
                // };

                $scope.deleteNode = function ($event, nodeInfo) {
                    var i, j;
                    var deleteConnection = $scope.contextOptions.deleteConnection;
                    var inputs = nodeInfo.inputs;
                    for (i = 0;  i < inputs.length; ++i) {
                        if (inputs[i].input) {
                            deleteConnection('input', inputs[i]);
                        }
                    }
                    var outputs = nodeInfo.outputs;
                    for (i = 0;  i < outputs.length; ++i) {
                        var connections = outputs[i].connections || [];
                        for (j = 0; j < connections.length; ++j) {
                            deleteConnection('output', outputs[i], j);
                        }
                    }
                    var pre = nodeInfo.predecessors;
                    for (i = 0; i < pre.length; ++i) {
                        deleteConnection('predecessor', pre, i);
                    }
                    var post = nodeInfo.successors;
                    for (i = 0; i < post.length; ++i) {
                        deleteConnection('successor', post, i);
                    }
                    var ind = $scope.shapes.indexOf(nodeInfo);
                    delete $scope.shapes.splice(ind, 1)[0];
                };

                $scope.deleteConnetion = function ($event, obj_arr) {
                    if (!obj_arr.isOpen && $scope.contextOptions.obj) {
                        $scope.contextOptions.obj.isOpen = false;
                    }
                    obj_arr.isOpen = !obj_arr.isOpen;
                    $scope.contextOptions.obj = obj_arr;
                };

                $scope.contextOptions = {
                    template: 'contextOptions.html',
                    obj: null,
                    deleteConnectionAndCloseContext: function (mode, obj_arr, index) {
                        $scope.contextOptions.deleteConnection(mode, obj_arr, index);
                        $scope.contextOptions.obj.isOpen = false;
                        // $scope.contextOptions.obj = null;
                    },
                    deleteConnection: function (mode, obj_arr, index) {
                        // TODO refactor this
                        if (mode == 'input') {
                            // Delete destination reference
                            var circle = obj_arr.getCircle();
                            var foreignConnections = obj_arr.input.origin.connections;
                            for (var i = 0; i < foreignConnections.length; ++i) {
                                if (foreignConnections[i].destination.getCircle() == circle) {
                                    break;
                                }
                            }
                            delete foreignConnections.splice(i, 1)[0];
                            obj_arr.input.pathObj.remove();
                            obj_arr.input = undefined;
                        } else if (mode == 'output') {
                            obj_arr.connections[index].destination.input = undefined;
                            obj_arr.connections[index].pathObj.remove();
                            delete obj_arr.connections.splice(index, 1)[0];
                        } else if (mode == 'successor') {
                            var circle = obj_arr.getCircle();
                            var foreignPredecessors = obj_arr[index].destination.predecessors;
                            for (var i = 0; i < foreignPredecessors.length; ++i) {
                                if (foreignPredecessors[i].origin.successors.getCircle() == circle) {
                                    break;
                                }
                            }
                            delete foreignPredecessors.splice(i, 1)[0];
                            obj_arr[index].pathObj.remove();
                            delete obj_arr.splice(index, 1)[0];
                        } else if (mode == 'predecessor') {
                            var circle = obj_arr.getCircle();
                            var foreignSuccessors = obj_arr[index].origin.successors;
                            for (var i = 0; i < foreignSuccessors.length; ++i) {
                                if (foreignSuccessors[i].destination.predecessors.getCircle() == circle) {
                                    break;
                                }
                            }
                            delete foreignSuccessors.splice(i, 1)[0];
                            obj_arr[index].pathObj.remove();
                            delete obj_arr.splice(index, 1)[0];
                        }
                    }
                };

                if ($scope.data.id) {
                    pipelineServices.getPipeline($scope.data.id).then(function (data) {
                        recomputeContainer();
                        var graph = angular.fromJson(data.data.graph);
                        for (var i = 0; i < graph.length; i++) {
                            var node = graph[i];
                            var nodeInfo = {
                                id: node.id,
                                path: node.path,
                                title: node.title,
                                inputs: node.inputs.map(function (inp) { return {name: inp.name}; }),
                                outputs: node.outputs.map(function (out) { return {name: out.name}; }),
                                predecessors: [], // node.predecessors.map(function (pre) { return {origin: pre.origin}; }),
                                successors: [], // node.successors.map(function (suc) { return {destination: suc.destination}; }),
                                x: node.x,
                                y: node.y
                            };
                            nodeIdCounter = Math.max(nodeIdCounter, node.id + 1);
                            $scope.shapes.push(nodeInfo);
                        }
                        $timeout(function(){
                            var nodeboxes = nodes.querySelectorAll('.node-box');
                            for (var i = 0; i < nodeboxes.length; ++i) {
                                createBox(nodeboxes[i], $scope.shapes[i]);
                            }
                            for (i = 0; i < graph.length; i++) {
                                var inputsData = graph[i].inputs;
                                var inputsCreated = $scope.shapes[i].inputs;
                                for (var j = 0; j < inputsData.length; ++j) {
                                    var origin = inputsData[j].origin;
                                    if (origin) {
                                        var node = $scope.shapes.find(function (e) {
                                            return e.id === origin.node;
                                        });
                                        var output = node.outputs.find(function (out) {
                                            return out.name === origin.connector;
                                        });
                                        var input = inputsCreated[j];
                                        var inpbox = input.getCircle().getBoundingClientRect();
                                        var outbox = output.getCircle().getBoundingClientRect();
                                        var oleft = outbox.left - containerLeft, otop = outbox.top - containerTop;
                                        var ileft = inpbox.left - containerLeft, itop = inpbox.top - containerTop;
                                        var path = paper.path(createPath(oleft + outbox.width / 2, otop + outbox.height / 2, ileft + inpbox.width / 2, itop + inpbox.height / 2));
                                        path.attr({stroke: '#4E4F4F', 'stroke-width': 2});
                                        if (!output.connections) {
                                            output.connections = [];
                                        }
                                        output.connections.push({pathObj: path, destination: input});
                                        input.input = {pathObj: path, origin: output};
                                    }
                                }
                                var predecessors = graph[i].predecessors;
                                var predecessorsCreated = $scope.shapes[i].predecessors;
                                var predecessorsCircle = predecessorsCreated.getCircle();
                                for (j = 0; j < predecessors.length; ++j) {
                                    var predecessorOrigin = predecessors[j].origin;
                                    var node = $scope.shapes.find(function (e) {
                                        return e.id === predecessorOrigin;
                                    });
                                    var inpbox = predecessorsCircle.getBoundingClientRect();
                                    var outbox = node.successors.getCircle().getBoundingClientRect();
                                    var oleft = outbox.left - containerLeft, otop = outbox.top - containerTop;
                                    var ileft = inpbox.left - containerLeft, itop = inpbox.top - containerTop;
                                    var path = paper.path(createPath(oleft + outbox.width / 2, otop + outbox.height / 2, ileft + inpbox.width / 2, itop + inpbox.height / 2));
                                    path.attr({stroke: '#6C4C13', 'stroke-width': 2, 'stroke-dasharray': '- '});
                                    node.successors.push({ pathObj: path, destination: $scope.shapes[i] });
                                    predecessorsCreated.push({ pathObj: path, origin: node });
                                }
                            }
                        }, 5);
                    });
                }
                $timeout(recomputeContainer, 200);
            }
        };
    }]);

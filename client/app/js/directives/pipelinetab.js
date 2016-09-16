angular.module('trafficEnv')
    .directive('pipelineTab', ['$timeout', 'scriptServices', 'pipelineServices', '$uibModal', 'socket', function($timeout, scriptServices, pipelineServices, $uibModal, socket){
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
                        var inputs = element.nodeInfo.inputs || [];
                        for (var i = inputs.length - 1; i >= 0; i--) {
                            var inp = inputs[i];
                            if (inp.input) {
                                var circ = inp.getCircle();
                                var path = inp.input.pathObj;
                                var circOrig = inp.input.origin.getCircle();
                                updateConnection(circ, circOrig, path);
                            }
                        }
                        var outputs = element.nodeInfo.outputs || [];
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
                        if (predecessors) {
                            var circ = predecessors.getCircle();
                            for (var i = predecessors.length - 1; i >= 0; i--) {
                                var inp = predecessors[i];
                                var path = inp.pathObj;
                                var circOrig = inp.origin.successors.getCircle();
                                updateConnection(circ, circOrig, path);
                            }
                        }
                        var successors = element.nodeInfo.successors;
                        if (successors) {
                            var circOrig = successors.getCircle();
                            for (var i = successors.length - 1; i >= 0; i--) {
                                var inp = successors[i];
                                var path = inp.pathObj;
                                var circ = inp.destination.predecessors.getCircle();
                                updateConnection(circ, circOrig, path);
                            }
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

                var createBoxIn = function (box, nodeInfo) {
                    var circles = box.querySelectorAll('.circle.start');
                    for (var i = circles.length - 1; i >= 0; i--) {
                        var circ = circles[i];
                        var out = nodeInfo.outputs[i];
                        out.getNode = function() { return nodeInfo; };
                        out.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                    }
                    box.style.top = nodeInfo.y + 'px';
                    box.style.left = nodeInfo.x + 'px';
                    box.style.visibility = 'visible';
                };

                var createBoxOut = function (box, nodeInfo) {
                    var circles = box.querySelectorAll('.circle.end');
                    for (var i = circles.length - 1; i >= 0; i--) {
                        var circ = circles[i];
                        var inp = nodeInfo.inputs[i];
                        inp.getNode = function() { return nodeInfo; };
                        inp.getCircle = (function(circ) { return function() { return circ; }; })(circ);
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

                var transformOutputGraph = function (graph, inp, out) {
                    return {
                        nodes: graph.map(function(e) {
                            return {
                                id: e.id,
                                type: e.type,
                                path: e.path,
                                hash: e.hash,
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
                                }),
                                isExecutor: e.isExecutor,
                                aimsun: e.aimsun
                            };
                        }),
                        inputs: inp?{
                            x: inp.x,
                            y: inp.y,
                            outputs: inp.outputs.map(function (output) {
                                return {
                                    name: output.name,
                                    connections: output.connections?output.connections.map(function (conn) {
                                        return {
                                            node: conn.destination.getNode().id,
                                            connector: conn.destination.name
                                        };
                                    }):[]
                                };
                            })
                        }:null,
                        outputs: out?{
                            x: out.x,
                            y: out.y,
                            inputs: out.inputs.map(function (input) {
                                return {
                                    name: input.name,
                                    origin: input.input?{ node: input.input.origin.getNode().id, connector: input.input.origin.name }:null
                                };
                            })
                        }:null,
                        isExecutor: executionNodeCounter>0,
                        aimsun: aimsunNodeCounter>0
                    };
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
                var executionNodeCounter = 0;
                var aimsunNodeCounter = 0;
                $scope.acceptedChannels = ['code', 'model', 'pipeline'].join(',');
                $scope.dropHandler = function ($event, $data, $channel) {
                    if ($channel == 'code') {
                        scriptServices.getScript($data, ['name', 'inout', 'path', 'hash', 'stype']).then(function (response) {
                            var nodeInfo = {
                                id: nodeIdCounter++,  // TODO replace by proper random id
                                type: $channel,
                                path: response.data.path,
                                hash: response.data.hash[0],
                                title: response.data.name,
                                inputs: (response.data.inout[0] || []).map(function (a) { return {name: a}; }),
                                outputs: (response.data.inout[1] || []).map(function (a) { return {name: a}; }),
                                predecessors: [],
                                successors: [],
                                isExecutor: false,
                                aimsun: response.data.stype != 'PythonScript'
                            };
                            aimsunNodeCounter += response.data.stype != 'PythonScript'?1:0;
                            $scope.shapes.push(nodeInfo);
                            $timeout(function(){
                                var nodeboxes = nodes.querySelectorAll('.node-box.stdnodes');
                                createBox(nodeboxes[nodeboxes.length-1], nodeInfo, $event.clientX, $event.clientY);
                            }, 5);
                        });
                    } else if ($channel == 'model') {
                        var nodeInfo = {
                            id: nodeIdCounter++,  // TODO replace by proper random id
                            type: $channel,
                            path: $data,  // TODO retrieve info from server
                            hash: null,
                            title: 'Model ' + $data,
                            inputs: [],
                            outputs: [{name: 'id_model'}],
                            predecessors: [],
                            successors: [],
                            isExecutor: false,
                            aimsun: false
                        };
                        $scope.shapes.push(nodeInfo);
                        $timeout(function(){
                            var nodeboxes = nodes.querySelectorAll('.node-box.stdnodes');
                            createBox(nodeboxes[nodeboxes.length-1], nodeInfo, $event.clientX, $event.clientY);
                        }, 5);
                    } else if ($channel == 'pipeline') {
                        pipelineServices.getPipeline($data).then(function (response) {
                            var data = response.data;
                            var pipeline = angular.fromJson(data.graph);
                            var nodeInfo = {
                                id: nodeIdCounter++,
                                type: $channel,
                                path: data.id,
                                hash: data.hash[0],
                                title: data.name,
                                inputs: (pipeline.inputs || {outputs:[]}).outputs.map(function (a) { return {name: a.name}; }),
                                outputs: (pipeline.outputs || {inputs: []}).inputs.map(function (a) { return {name: a.name}; }),
                                predecessors: [],
                                successors: [],
                                isExecutor: pipeline.isExecutor,
                                aimsun: pipeline.aimsun
                            };
                            executionNodeCounter += pipeline.isExecutor?1:0;
                            aimsunNodeCounter += pipeline.aimsun?1:0;
                            $scope.shapes.push(nodeInfo);
                            $timeout(function(){
                                var nodeboxes = nodes.querySelectorAll('.node-box.stdnodes');
                                createBox(nodeboxes[nodeboxes.length-1], nodeInfo, $event.clientX, $event.clientY);
                            }, 5);
                        });
                    }
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
                        pipelineServices.savePipeline(name, location, transformOutputGraph($scope.shapes, $scope.pipelineInputs, $scope.pipelineOutputs)).then(function (data) {
                            $scope.switchNew({ntab: {
                                id: data.data.id,
                                name: data.data.name,
                                type: data.data.type
                            }});
                        });
                    });
                };

                $scope.savePipeline = function () {
                    pipelineServices.updatePipeline($scope.data.id, transformOutputGraph($scope.shapes, $scope.pipelineInputs, $scope.pipelineOutputs));
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
                    // if ($scope.pipelineInputs) {
                        // TODO request comment for execution (and maybe name)
                        $scope.inputValues = $scope.pipelineInputs?$scope.pipelineInputs.outputs.map(function (e) { return {inputType: 'string', inputValue: '', name: e.name}; }):[];
                        var modalInstance = $uibModal.open({
                            animate: true,
                            templateUrl: 'templates/pipeline-inputs.html',
                            scope: $scope
                        });

                        modalInstance.result.then(function () {
                            // TODO get and validate input values from $scope
                            var castInputValue = function (iv) {
                                switch (iv.inputType) {
                                    case 'null': return null;
                                    case 'boolean': return iv.inputValue=='False'?false:true;
                                    default: return iv.inputValue;
                                }
                            };
                            var info = {};
                            var len = $scope.inputValues.length;
                            for (var i = 0; i < len; ++i) {
                                info[$scope.inputValues[i].name] = castInputValue($scope.inputValues[i]);
                            }
                            info['comment'] = $scope.comment;
                            pipelineServices.runPipeline($scope.data.id, info);
                            delete $scope.comment;
                        });
                    // } else {
                    //     pipelineServices.runPipeline($scope.data.id);
                    // }
                };

                $scope.shapes = [];
                $scope.pipelineInputs = null;
                $scope.pipelineOutputs = null;
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

                $scope.toggleInfoShown = function ($event, nodeInfo) {
                    nodeInfo.infoShown = !nodeInfo.infoShown;
                    if ($scope.infoNodePopover.node && $scope.infoNodePopover.node != nodeInfo) {
                        $scope.infoNodePopover.node.infoShown = false;
                    }
                    $scope.infoNodePopover.node = nodeInfo;
                };

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
                        while (connections.length > 0) {
                            deleteConnection('output', outputs[i], 0);
                        }
                    }
                    var pre = nodeInfo.predecessors;
                    while (pre.length > 0) {
                        deleteConnection('predecessor', pre, 0);
                    }
                    var post = nodeInfo.successors;
                    while (post.length > 0) {
                        deleteConnection('successor', post, 0);
                    }
                    executionNodeCounter -= nodeInfo.isExecutor?1:0;
                    aimsunNodeCounter -= nodeInfo.aimsun?1:0;
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

                $scope.addNode = function (nodeType) {
                    var inputs = [], outputs = [], isExecutor = false;
                    if (nodeType == 'Run Simulation') {
                        inputs  = [{name: 'model'}, {name: 'replication'}];
                        outputs = [];
                        isExecutor = true;
                    } else if (nodeType == 'Open Model') {
                        inputs  = [{name: 'id_model'}];
                        outputs = [{name: 'model'}];
                        isExecutor = false;
                    } else if (nodeType == 'Close Model') {
                        inputs  = [{name: 'model'}];
                        outputs = [];
                        isExecutor = false;
                    } else if (nodeType == 'Save Model') {
                        inputs  = [{name: 'model'}];
                        outputs = [];
                        isExecutor = false;
                    }
                    var nodeInfo = {
                        id: nodeIdCounter++,  // TODO replace by proper random id
                        type: 'special',
                        path: '<' + nodeType.toUpperCase().replace(/\s/g, '_') + '>',
                        hash: null,
                        title: nodeType,
                        inputs: inputs,
                        outputs: outputs,
                        predecessors: [],
                        successors: [],
                        x: containerLeft,
                        y: containerTop,
                        isExecutor: isExecutor,
                        aimsun: true
                    };
                    executionNodeCounter += isExecutor?1:0;
                    aimsunNodeCounter += 1;
                    $scope.shapes.push(nodeInfo);
                    $timeout(function(){
                        var nodeboxes = nodes.querySelectorAll('.node-box.stdnodes');
                        createBox(nodeboxes[nodeboxes.length-1], nodeInfo);
                    }, 5);
                };

                $scope.addInputs = function () {
                    $scope.pipelineInputs = {
                        x: containerLeft,
                        y: containerTop,
                        outputs: []
                    };
                    $timeout(function (){
                        var node = nodes.querySelector('.input-box');
                        createBoxIn(node, $scope.pipelineInputs);
                    }, 5);
                };

                $scope.newPipelineInput = function () {
                    $scope.pipelineInputs.outputs.push({name: '', editionMode: true});
                    $timeout(function () {
                        // TODO call some form of createBoxIn
                        createBoxIn(nodes.querySelector('.input-box'), $scope.pipelineInputs);
                    }, 5);
                };

                $scope.newPipelineOutput = function () {
                    $scope.pipelineOutputs.inputs.push({name: '', editionMode: true});
                    $timeout(function () {
                        // TODO call some form of createBoxOut
                        createBoxOut(nodes.querySelector('.output-box'), $scope.pipelineOutputs);
                    }, 5);
                };

                $scope.deleteInputs = function ($event) {
                    var deleteConnection = $scope.contextOptions.deleteConnection;
                    var out = $scope.pipelineInputs.outputs;
                    for (var i = 0; i < out.length; ++i) {
                        var connections = out[i].connections || [];
                        while (connections.length > 0) {
                            deleteConnection('output', outputs[i], 0);
                        }
                    }
                    $scope.pipelineInputs = null;
                };

                $scope.deleteOutputs = function ($event) {
                    var deleteConnection = $scope.contextOptions.deleteConnection;
                    var inp = $scope.pipelineOutputs.inputs;
                    for (var i = 0; i < inp.length; ++i) {
                        if (inp[i].input) {
                            deleteConnection('input', inp[i]);
                        }
                    }
                    $scope.pipelineOutputs = null;
                };

                $scope.addOutputs = function () {
                    $scope.pipelineOutputs = {
                        x: containerLeft,
                        y: containerTop,
                        inputs: []
                    };
                    $timeout(function(){
                        var node = nodes.querySelector('.output-box');
                        createBoxOut(node, $scope.pipelineOutputs);
                    }, 5);
                };

                $scope.infoNodePopover = {
                    template: 'nodeInfo.html',
                    node: null
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
                    function refreshHashes(data) {
                        var latestVersion = !$scope.currentHash || $scope.currentHash == $scope.hashes[0];
                        $scope.hashes = data.data.hash;
                        if (latestVersion) {
                            $scope.currentHash = $scope.hashes[0];
                        }
                    }
                    function loadPipeline (data) {
                        recomputeContainer();
                        var pipeline = angular.fromJson(data.data.graph);
                        refreshHashes(data);
                        var graph = pipeline.nodes;
                        for (var i = 0; i < graph.length; i++) {
                            var node = graph[i];
                            var nodeInfo = {
                                id: node.id,
                                type: node.type,
                                path: node.path,
                                hash: node.hash,
                                title: node.title,
                                inputs: node.inputs.map(function (inp) { return {name: inp.name}; }),
                                outputs: node.outputs.map(function (out) { return {name: out.name}; }),
                                predecessors: [], // node.predecessors.map(function (pre) { return {origin: pre.origin}; }),
                                successors: [], // node.successors.map(function (suc) { return {destination: suc.destination}; }),
                                x: node.x,
                                y: node.y,
                                isExecutor: node.isExecutor,
                                aimsun: node.aimsun
                            };
                            executionNodeCounter += node.isExecutor?1:0;
                            aimsunNodeCounter += node.aimsun?1:0;
                            nodeIdCounter = Math.max(nodeIdCounter, node.id + 1);
                            $scope.shapes.push(nodeInfo);
                        }
                        if (pipeline.inputs) {
                            $scope.pipelineInputs = {
                                x: pipeline.inputs.x,
                                y: pipeline.inputs.y,
                                outputs: pipeline.inputs.outputs.map(function (out) { return {name: out.name}; })
                            };
                        }
                        if (pipeline.outputs) {
                            $scope.pipelineOutputs = {
                                x: pipeline.outputs.x,
                                y: pipeline.outputs.y,
                                inputs: pipeline.outputs.inputs.map(function (inp) { return {name: inp.name}; })
                            };
                        }
                        $timeout(function(){
                            var nodeboxes = nodes.querySelectorAll('.node-box.stdnodes');
                            for (var i = 0; i < nodeboxes.length; ++i) {
                                createBox(nodeboxes[i], $scope.shapes[i]);
                            }
                            if (pipeline.inputs) {
                                var inputNode = nodes.querySelector('.input-box');
                                createBoxIn(inputNode, $scope.pipelineInputs);
                            }
                            if (pipeline.outputs) {
                                var outputNode = nodes.querySelector('.output-box');
                                createBoxOut(outputNode, $scope.pipelineOutputs);
                            }
                            for (i = 0; i < graph.length; i++) {
                                var inputsData = graph[i].inputs;
                                var inputsCreated = $scope.shapes[i].inputs;
                                for (var j = 0; j < inputsData.length; ++j) {
                                    var origin = inputsData[j].origin;
                                    if (origin) {
                                        var choice = origin.node!==null && origin.node!==undefined;
                                        var node = choice?$scope.shapes.find(function (e) {
                                            return e.id === origin.node;
                                        }):$scope.pipelineInputs;

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
                            if (pipeline.outputs) {
                                var arr = pipeline.outputs.inputs;
                                var inputsCreated = $scope.pipelineOutputs.inputs;
                                for (i = 0; i < arr.length; ++i) {
                                    var origin = arr[i].origin;
                                    if (origin) {
                                        var choice = origin.node !== null && origin.node !== undefined;
                                        var node = choice?$scope.shapes.find(function (e) {
                                            return e.id === origin.node;
                                        }):$scope.pipelineInputs;

                                        var output = node.outputs.find(function (out) {
                                            return out.name === origin.connector;
                                        });
                                        var input = inputsCreated[i];
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
                            }
                        }, 5);
                    }
                    pipelineServices.getPipeline($scope.data.id).then(loadPipeline);

                    var onChangedPipeline = function (data, hash) {
                        if ($scope.data.id === data.id && $scope.permission == 'read_only' && (hash || $scope.currentHash == $scope.hashes[0])) {
                            var i, j, input, len = $scope.shapes.length;
                            for (i = 0; i < len; ++i) {
                                var node = $scope.shapes[i];
                                for (j = 0; j < node.inputs.length; ++j) {
                                    input = node.inputs[j];
                                    if (input.input) {
                                        input.input.pathObj.remove();
                                    }
                                }
                                for (j = 0; j < node.predecessors.length; ++j) {
                                    node.predecessors[j].pathObj.remove();
                                }
                            }
                            if ($scope.pipelineOutputs) {
                                len = $scope.pipelineOutputs.inputs.length;
                                for (i = 0; i < len; ++i) {
                                    input = $scope.pipelineOutputs.inputs[i];
                                    if (input.input) {
                                        input.input.pathObj.remove();
                                    }
                                }
                            }
                            $scope.shapes = [];
                            $scope.pipelineInputs = null;
                            $scope.pipelineOutputs = null;
                            nodeIdCounter = 0;
                            executionNodeCounter = 0;
                            aimsunNodeCounter = 0;
                            pipelineServices.getPipeline($scope.data.id, hash).then(loadPipeline);
                        } else if ($scope.permission != 'read_only' || !hash && $scope.currentHash != $scope.hashes[0]) {
                            pipelineServices.getPipeline($scope.data.id).then(refreshHashes);
                        }
                    };

                    socket.on('changed_pipeline', onChangedPipeline);
                    // Try acquire write permission
                    var roomName = $scope.data.id;
                    var role = new SocketIOFirebase(socket, roomName);
                    role.initRoom();
                    var usersRef = role.child('users');
                    var users = {}, userName = role.push().key(), initialized = false;
                    $scope.permission = 'read_only';

                    var userChange = function (snapshot) {
                        users[snapshot.key()] = snapshot.val();
                        if (initialized && get_users_with_write().length == 0) {
                            var randomTimeout = Math.random()*1000;
                            $timeout(initRequest, randomTimeout);
                        }
                    };

                    var userRemoved = function (snapshot) {
                        users[snapshot.key()] = null;
                        if (initialized && get_users_with_write().length == 0) {
                            var randomTimeout = Math.random()*1000;
                            $timeout(initRequest, randomTimeout);
                        }
                    };

                    var get_users_with_write = function () {
                        var retval = [];
                        for (var user in users) {
                            if (users[user] == 'read_write') {
                                retval.push(user);
                            }
                        }
                        return retval;
                    };

                    var initRequest = function () {
                        var permission = get_users_with_write().length==0?'read_write':'read_only';
                        // var child = {};
                        // child[userName] = permission;

                        usersRef.child(userName).transaction(function() {
                            return permission;
                        }, function () {
                            if (permission == 'read_write' && get_users_with_write().length > 1) {
                                permission = 'read_only';
                                var randomTimeout = Math.random()*1000;
                                usersRef.child(userName).transaction(function() { return permission; }, function() { $timeout(initRequest, randomTimeout); } );
                            } else {
                                $scope.permission = permission;
                            }
                        });
                    };

                    $scope.changeHash = function () {
                        if ($scope.currentHash != $scope.hashes[0]) {
                            initialized = false;
                            $scope.permission = 'read_only';
                            usersRef.child(userName).set('read_only');
                            onChangedPipeline($scope.data, $scope.currentHash);
                        } else {
                            onChangedPipeline($scope.data);
                            initialized = true;
                            initRequest();
                        }
                    }

                    usersRef.on('child_added', userChange);
                    usersRef.on('child_changed', userChange);
                    usersRef.on('child_removed', userRemoved);

                    // After loading, init request
                    usersRef.once('value', function () {
                        initialized = true;
                        initRequest();
                    });

                    $scope.$on('$destroy', function() {
                        usersRef.off('child_added', userChange);
                        usersRef.off('child_changed', userChange);
                        usersRef.off('child_removed', userRemoved);
                        usersRef.child(userName).remove();
                        socket.emit('unsubscribe', {channel: roomName});
                        socket.removeListener('changed_pipeline', onChangedPipeline);
                    });
                }
                $timeout(recomputeContainer, 200);
            }
        };
    }]);

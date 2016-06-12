angular.module('trafficEnv', ['treeControl', 'ui.ace', 'APIServices', 'ui.bootstrap', 'btford.socket-io', 'ang-drag-drop'])

    .factory('socket', ['socketFactory', function(socketFactory){
        return socketFactory({
            prefix: 'event-',
            ioSocket: io.connect('/subscription')
        });
    }])

    .directive('panelBrowser', function() {
        return {
            controller: ['$scope', 'scriptServices', 'modelServices', 'pipelineServices', 'socket',
            function($scope, scriptServices, modelServices, pipelineServices, socket) {

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
                            {name: 'Models', id: '.', type: 'dir', children: data.data}
                        ];
                        pipelineServices.getPipelineCollection().then(function (data) {
                            var pipelinesDirectories = data.data;
                            $scope.treeFiles = scriptsDirectories.concat(modelsDirectories).concat(pipelinesDirectories);
                        });
                    });
                });

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

                socket.on('msg', function (data) {
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
                        } else {
                            currentNode.push(tab);
                            currentNode.sort(function (a,b) {
                                return a.name.localeCompare(b.name);
                            });
                        }
                    };
                    var where = data.id.split('\\');
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
                    var where = id.split('\\');
                    where.pop();
                    deleteScript($scope.treeFiles[0].children, where, id);
                    $scope.deleteTab(id);
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
                        } else {
                            currentNode.push(tab);
                            currentNode.sort(function (a,b) {
                                return a.name.localeCompare(b.name);
                            });
                        }
                    };
                    var where = data.id.split('\\');
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
                    var where = id.split('\\');
                    where.pop();
                    deletePipeline($scope.treeFiles[2].children, where, id);
                    $scope.deleteTab(id);
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
                        type: 'pipeline',
                        isActive: true
                    });
                };

                $scope.deleteTab = function (id) {
                    var tab = $scope.tabset.find(function (tab) {
                        return tab.id == id;
                    });

                    tab.id = undefined;
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

                this.deleteTab = function (id) {
                    $scope.deleteTab(id);
                };

                $scope.changeSelected = function (elem) {
                    panelBrowserCtrl.changeSelected(elem);
                };

                panelBrowserCtrl.selectListener(this.selectTab);
                panelBrowserCtrl.deleteListener(this.deleteTab);
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
                        templateUrl: 'saveAsModal.html',
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
                        templateUrl: 'deleteModal.html',
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
    })

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

                var mousemove = function (ev) {
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
                    }
                };

                var startMoving = $scope.startMoving = function (ev, target, nodeInfo) {
                    // element = target;
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

                var stopMoving = function (ev) {
                    if (element) {                    
                        element.moving = false;
                        element.target.classList.remove('moving');
                        element = null;
                    }
                };

                var createBox = function (box, nodeInfo, posx, posy) {
                    // var box = document.createElement('div');
                    // var boxContent;
                    // var connCircleStart = '<div class="circle start"></div>';
                    // var connCircleEnd = '<div class="circle end"></div>';
                    // boxContent  = '<div class="title"><span>' + nodeInfo.title + '</span></div>\n';
                    // boxContent += '<div class="inputs_outputs">\n';
                    // for (var i = 0; i < nodeInfo.inputs.length && i < nodeInfo.outputs.length; ++i) {
                    //     boxContent += '<div class="io-row clearfix">\n';
                    //     boxContent += '<div class="io-cell" uib-popover="hola" popover-trigger="contextmenu" popover-is-open="true" >'+ connCircleEnd + '<span>' + nodeInfo.inputs[i].name + '</span></div>';
                    //     boxContent += '<div class="io-cell" uib-popover="hola" popover-trigger="contextmenu" popover-is-open="true" ><span>' + nodeInfo.outputs[i].name + '</span>' + connCircleStart + '</div>';
                    //     boxContent += '</div>';
                    // }
                    // while (i < nodeInfo.inputs.length) {
                    //     boxContent += '<div class="io-row clearfix">\n';
                    //     boxContent += '<div class="io-cell" uib-popover="hola" popover-trigger="contextmenu" popover-is-open="true" >'+ connCircleEnd + '<span>' + nodeInfo.inputs[i].name + '</span></div>';
                    //     boxContent += '<div class="io-cell" uib-popover="hola" popover-trigger="contextmenu" popover-is-open="true" ></div>';
                    //     boxContent += '</div>';
                    //     ++i;
                    // }
                    // while (i < nodeInfo.outputs.length) {
                    //     boxContent += '<div class="io-row clearfix">\n';
                    //     boxContent += '<div class="io-cell" uib-popover="hola" popover-trigger="contextmenu" popover-is-open="true" ></div>';
                    //     boxContent += '<div class="io-cell" uib-popover="hola" popover-trigger="contextmenu" popover-is-open="true" ><span>' + nodeInfo.outputs[i].name + '</span>' + connCircleStart + '</div>';
                    //     boxContent += '</div>';
                    //     ++i;
                    // }
                    // boxContent += '</div>';
                    // box.innerHTML = boxContent;
                    // box.classList.add('node-box');
                    // box.addEventListener('mousedown', function (ev) { startMoving(ev, box, nodeInfo); }, false);
                    var circles = box.querySelectorAll('.circle.start');
                    for (i = circles.length - 1; i >= 0; i--) {
                        var circ = circles[i];
                        var inp = nodeInfo.outputs[i];
                        // var csc = function(inp) { return function(ev) { createStartingConnection(ev, inp); }; };
                        // var fec = function (inp) { return function (ev) { finishEndingConnection(ev, inp); }; };
                        inp.getNode = function() { return nodeInfo; };
                        inp.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                        // circ.addEventListener('mousedown', csc(inp), false);
                        // circ.addEventListener('mouseup', fec(inp), false);
                    }
                    circles = box.querySelectorAll('.circle.end');
                    for (i = circles.length - 1; i >= 0; i--) {
                        var circ = circles[i];
                        var out = nodeInfo.inputs[i];
                        // var cec = function (out) { return function (ev) { createEndingConnection(ev, out); }; };
                        // var fsc = function (out) { return function (ev) { finishStartingConnection(ev, out); }; };
                        out.getNode = function() { return nodeInfo; };
                        out.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                        // circ.addEventListener('mousedown', cec(out), false);
                        // circ.addEventListener('mouseup', fsc(out), false);
                    }
                    // parent.appendChild(box);
                    // var width = parseInt(box.style.width), height = parseInt(box.style.height);
                    var wh = box.getBoundingClientRect();
                    if (posx && posy) {
                        nodeInfo.y = (posy - containerTop - wh.height/2);
                        nodeInfo.x = (posx - containerLeft - wh.width/2);
                    }
                    box.style.top = nodeInfo.y + 'px';
                    box.style.left = nodeInfo.x + 'px';
                    box.style.visibility = 'visible';
                    // return box;
                    // var getNode = function () {
                    //     return nodeInfo;
                    // };
                    // for (var i = 0; i < nodeInfo.inputs.length; ++i) {
                    //     nodeInfo.inputs[i].getNode = getNode;
                    // }
                    // for (i = 0; i < nodeInfo.outputs.length; ++i) {
                    //     nodeInfo.outputs[i].getNode = getNode;
                    // }
                };

                var startingPath;
                var createStartingConnection = $scope.createStartingConnection = function (ev, nodeConnector) {
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
                var createEndingConnection = $scope.createEndingConnection = function (ev, nodeConnector) {
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

                var drawpath = function (ev) {
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

                var finishStartingConnection = $scope.finishStartingConnection = function (ev, nodeConnector) {
                    if (startingPath && nodeConnector.getNode() !== startingPath.connectorOut.getNode()) {
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
                        startingPath.connectorOut.connections.push({pathObj: startingPath.figure, destination: nodeConnector});
                        if (nodeConnector.input) {
                            nodeConnector.input.pathObj.remove();
                        }
                        nodeConnector.input = {pathObj: startingPath.figure, origin: startingPath.connectorOut};
                        startingPath = null;
                    }
                };

                var finishEndingConnection = $scope.finishEndingConnection = function (ev, nodeConnector) {
                    if (endingPath && nodeConnector.getNode() !== endingPath.connectorIn.getNode()) {
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
                        nodeConnector.connections.push({pathObj: endingPath.figure, destination: endingPath.connectorIn});
                        if (endingPath.connectorIn.input) {
                            endingPath.connectorIn.input.pathObj.remove();
                        }
                        endingPath.connectorIn.input = {pathObj: endingPath.figure, origin: nodeConnector};
                        endingPath = null;
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
                nodes.addEventListener('mousemove', mousemove, false);
                nodes.addEventListener('mousemove', drawpath, false);
                nodes.addEventListener('mouseup', stopMoving, false);
                nodes.addEventListener('resize', recomputeContainer, false);
                var boundingClientRect = nodes.getBoundingClientRect();
                var containerWidth = boundingClientRect.width;
                var containerHeight = boundingClientRect.height;
                var containerLeft = boundingClientRect.left;
                var containerTop = boundingClientRect.top;
                var paper = Raphael(iElm[0].children[1].children[0]);

                $scope.dropHandler = function ($event, $data) {
                    // console.log("Received dropdown", $data);
                    scriptServices.getScript($data, ['name', 'inout', 'path']).then(function (response) {
                        var nodeInfo = {
                            id: $scope.shapes.length,  // TODO replace by proper random id
                            path: response.data.path,
                            title: response.data.name,
                            inputs: (response.data.inout[0] || []).map(function (a) { return {name: a}; }),
                            outputs: (response.data.inout[1] || []).map(function (a) { return {name: a}; })
                        };
                        $scope.shapes.push(nodeInfo);
                        // $scope.$apply();
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
                        templateUrl: 'saveAsModal.html',
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
                        templateUrl: 'deleteModal.html',
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
                                x: node.x,
                                y: node.y
                            };
                            $scope.shapes.push(nodeInfo);
                            // $scope.$apply();
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
                            }
                        }, 5);
                        // TODO REMOVE, this is just to validate
                        // console.log("Testing loaded correctly:", angular.toJson(transformOutputGraph($scope.shapes)) === data.data.graph);
                    });
                }
                $timeout(recomputeContainer, 200);
            }
        };
    }]);

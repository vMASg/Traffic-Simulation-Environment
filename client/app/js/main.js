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
                            {name: 'Models', id: '.', type: 'dir', children: data.data}
                        ];
                        $scope.treeFiles = scriptsDirectories.concat(modelsDirectories);
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

    .directive('pipelineTab', function(){
        return {
            scope: {
                'data': '=tabData',
                'switchNew': '&'
            },
            templateUrl: 'templates/pipeline-tab.html',
            link: function($scope, iElm, iAttrs, controller) {
                var element;

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
                        var inputs = element.nodeInfo.inputs;
                        for (var i = inputs.length - 1; i >= 0; i--) {
                            var inp = inputs[i];
                            if (inp.input) {
                                var circ = inp.getCircle();
                                var path = inp.input.pathObj;
                                var circOrig = inp.input.origin.getCircle();
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
                                path.attr({path: createPath(oleft + owidth / 2, otop + oheight / 2, dleft + dwidth / 2, dtop + dheight / 2)});
                            }
                        }
                    }
                };

                var startMoving = function (ev, target, nodeInfo) {
                    // element = target;
                    element = {target: target};
                    var posX = ev.clientX, posY = ev.clientY;
                    var top = target.style.top.replace('px',''), left = target.style.left.replace('px','');
                    var width = parseInt(target.style.width), height = parseInt(target.style.height);

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

                var createBox = function (parent, nodeInfo) {
                    var box = document.createElement('div');
                    var boxContent;
                    var connCircleStart = '<div class="circle start"></div>';
                    var connCircleEnd = '<div class="circle end"></div>';
                    boxContent  = '<div class="title"><span>' + nodeInfo.title + '</span></div>\n';
                    boxContent += '<div class="inputs_outputs">\n';
                    for (var i = 0; i < nodeInfo.inputs.length && i < nodeInfo.outputs.length; ++i) {
                        boxContent += '<div class="io-row clearfix">\n';
                        boxContent += '<div class="io-cell">'+ connCircleEnd + '<span>' + nodeInfo.inputs[i].name + '</span></div>';
                        boxContent += '<div class="io-cell"><span>' + nodeInfo.outputs[i].name + '</span>' + connCircleStart + '</div>';
                        boxContent += '</div>';
                    }
                    while (i < nodeInfo.inputs.length) {
                        boxContent += '<div class="io-row clearfix">\n';
                        boxContent += '<div class="io-cell">'+ connCircleEnd + '<span>' + nodeInfo.inputs[i].name + '</span></div>';
                        boxContent += '<div class="io-cell"></div>';
                        boxContent += '</div>';
                        ++i;
                    }
                    while (i < nodeInfo.outputs.length) {
                        boxContent += '<div class="io-row clearfix">\n';
                        boxContent += '<div class="io-cell"></div>';
                        boxContent += '<div class="io-cell"><span>' + nodeInfo.outputs[i].name + '</span>' + connCircleStart + '</div>';
                        boxContent += '</div>';
                        ++i;
                    }
                    boxContent += '</div>';
                    box.innerHTML = boxContent;
                    box.classList.add('node-box');
                    box.addEventListener('mousedown', function (ev) { startMoving(ev, box, nodeInfo); }, false);
                    var circles = box.querySelectorAll('.circle.start');
                    for (i = circles.length - 1; i >= 0; i--) {
                        var circ = circles[i];
                        var inp = nodeInfo.outputs[i];
                        var csc = function(inp) { return function(ev) { createStartingConnection(ev, inp); }; };
                        var fec = function (inp) { return function (ev) { finishEndingConnection(ev, inp); }; };
                        inp.getNode = function() { return nodeInfo; };
                        inp.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                        circ.addEventListener('mousedown', csc(inp), false);
                        circ.addEventListener('mouseup', fec(inp), false);
                    }
                    circles = box.querySelectorAll('.circle.end');
                    for (i = circles.length - 1; i >= 0; i--) {
                        var circ = circles[i];
                        var out = nodeInfo.inputs[i];
                        var cec = function (out) { return function (ev) { createEndingConnection(ev, out); }; };
                        var fsc = function (out) { return function (ev) { finishStartingConnection(ev, out); }; };
                        out.getNode = function() { return nodeInfo; };
                        out.getCircle = (function(circ) { return function() { return circ; }; })(circ);
                        circ.addEventListener('mousedown', cec(out), false);
                        circ.addEventListener('mouseup', fsc(out), false);
                    }
                    parent.appendChild(box);
                    return box;
                };

                var startingPath;
                var createStartingConnection = function (ev, nodeConnector) {
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
                        startingPath.figure.attr({stroke: '#4E4F4F', 'stroke-width': 1});
                    }
                };

                var endingPath;
                var createEndingConnection = function (ev, nodeConnector) {
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
                        endingPath.figure.attr({stroke: '#4E4F4F', 'stroke-width': 1});
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

                var finishStartingConnection = function (ev, nodeConnector) {
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
                        nodeConnector.input = {pathObj: startingPath.figure, origin: startingPath.connectorOut};
                        startingPath = null;
                    }
                };

                var finishEndingConnection = function (ev, nodeConnector) {
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
                        nodeConnector.connections.push({pathObj: endingPath.figure, origin: endingPath.connectorIn});
                        endingPath.connectorIn.input = {pathObj: endingPath.figure, destination: nodeConnector};
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

                var nodes = iElm[0].children[1].children[1];
                nodes.addEventListener('mousemove', mousemove, false);
                nodes.addEventListener('mousemove', drawpath, false);
                nodes.addEventListener('mouseup', stopMoving, false);
                var boundingClientRect = nodes.getBoundingClientRect();
                var containerWidth = parseInt(nodes.style.width);
                var containerHeight = parseInt(nodes.style.height);
                var containerLeft = boundingClientRect.left;
                var containerTop = boundingClientRect.top;
                var paper = Raphael(iElm[0].children[1].children[0]);

                $scope.connections = [];
                $scope.shapes = [
                    createBox(nodes, {title: 'something.py', inputs: [{name: 'in'}], outputs: [{name: 'out'}]}),
                    createBox(nodes, {title: 'something2.py', inputs: [{name: 'in'}, {name: 'input'}], outputs: [{name: 'out'}, {name: 'output'}]})
                ];
            }
        };
    });
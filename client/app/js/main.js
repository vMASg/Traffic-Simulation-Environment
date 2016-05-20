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
                'data': "=tabData",
                'switchNew': '&'
            },
            templateUrl: 'templates/pipeline-tab.html',
            link: function($scope, iElm, iAttrs, controller) {
                // var dragger = function () {
                //     this.ox = this.type == "rect" ? this.attr("x") : this.attr("cx");
                //     this.oy = this.type == "rect" ? this.attr("y") : this.attr("cy");
                //     this.animate({"fill-opacity": 0.5}, 500);
                // };

                // var move = function (dx, dy) {
                //     var att = this.type == "rect" ? {x: this.ox + dx, y: this.oy + dy} : {cx: this.ox + dx, cy: this.oy + dy};
                //     this.attr(att);
                //     for (var i = $scope.connections.length; i--;) {
                //         paper.connection($scope.connections[i]);
                //     }
                //     // paper.safari();
                // };

                // var up = function () {
                //     this.animate({"fill-opacity": 0.5}, 500);
                // };
                var element;

                var mousemove = function (ev) {
                    // var element = ev.target;
                    if (element && element.moving) {
                        var posX = ev.clientX, posY = ev.clientY;
                        var aX = posX - element.diffX, aY = posY - element.diffY;
                        if (aX < 0) aX = 0;
                        if (aY < 0) aY = 0;
                        if (aX + element.ew > containerWidth) aX = containerWidth - element.ew;
                        if (aY + element.eh > containerHeight) aY = containerHeight -element.eh;
                        element.style.left = aX + 'px';
                        element.style.top = aY + 'px';
                    }
                };

                var startMoving = function (ev) {
                    element = ev.target;
                    var posX = ev.clientX, posY = ev.clientY;
                    var top = element.style.top.replace('px',''), left = element.style.left.replace('px','');
                    var width = parseInt(element.style.width), height = parseInt(element.style.height);

                    element.diffX = posX - left;
                    element.diffY = posY - top;
                    element.ew = width;
                    element.eh = height;
                    element.moving = true;

                    // element.addEventListener('mousemove', mousemove, true);
                    element.classList.add('moving');
                };

                var stopMoving = function (ev) {
                    // element.removeEventListener('mousemove', mousemove);
                    element.moving = false;
                    element.classList.remove('moving');
                    element = null;
                };

                var createBox = function (parent) {
                    // var box = paper.set();
                    // var rect = paper.rect(0, 0, 200, 260, 10);
                    // rect.attr({fill: '#131516', "fill-opacity": 0.5, cursor: "move"});
                    // var text = paper.text(80, 5, "Hello World");
                    // box.push(
                    //     rect,
                    //     text
                    // );
                    // box.attr({x: 230, y: 340, "stroke-width": 0});
                    // box.drag(move, dragger, up);
                    // return box;
                    var box = document.createElement('div');
                    box.classList.add('node-box');
                    box.addEventListener('mousedown', startMoving, true);
                    // box.addEventListener('mousemove', mousemove, true);
                    // box.addEventListener('mouseup', stopMoving, true);
                    parent.appendChild(box);
                    return box;
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

                    return ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
                };

                var nodes = iElm[0].children[1].children[1];
                nodes.addEventListener('mousemove', mousemove, true);
                nodes.addEventListener('mouseup', stopMoving, true);
                var containerWidth = parseInt(nodes.style.width);
                var containerHeight = parseInt(nodes.style.height);
                var paper = Raphael(iElm[0].children[1].children[0]);

                $scope.connections = [];
                $scope.shapes = [
                    createBox(nodes),
                    createBox(nodes)
                ];

                paper.path(createPath(200, 300, 400, 50)).attr({stroke: '#4E4F4F', 'stroke-width': 1});

                // for (var i = 0, ii = $scope.shapes.length; i < ii; i++) {
                //     var color = Raphael.getColor();
                //     $scope.shapes[i].attr({fill: color, stroke: color, "fill-opacity": 0, "stroke-width": 2, cursor: "move"});
                //     $scope.shapes[i].drag(move, dragger, up);
                // }
                // $scope.connections.push(paper.connection($scope.shapes[0], $scope.shapes[1], "#fff"));
                // $scope.connections.push(paper.connection($scope.shapes[1], $scope.shapes[2], "#fff", "#fff|5"));
                // $scope.connections.push(paper.connection($scope.shapes[1], $scope.shapes[3], "#000", "#fff"));
            }
        };
    });
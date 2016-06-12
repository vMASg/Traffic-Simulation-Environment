angular.module('trafficEnv')
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
    });

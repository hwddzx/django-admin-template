(function () {

    angular.module("quail.layout", [])
        .factory("LayoutService", LayoutService)
        .directive("layoutTree", layoutTree)
        .directive("tbLayoutArea", tbLayoutArea)
        .controller("layoutCtrl", layoutCtrl);

    function LayoutService($http, $q, DataService) {
        var host,
            service = {
                initLayout: initLayout,
                setHost: setHost,
                getHost: getHost,
                getBoundValue: getBoundValue,
                getAnchorByXml: getAnchorByXml
            };
        return service;

        function setHost(data) {
            host = data;
        }

        function getHost() {
           return host;
        }

        function getBoundValue(bounds) {
            bounds = bounds.match(/\d+/g);
            return {
                x1: +bounds[0],
                y1: +bounds[1],
                x2: +bounds[2],
                y2: +bounds[3]
            }
        }

        /*
         * id: xml树指令id
         * originArea: 用户框选的区域比例
         * */
        function getAnchorByXml(id, originArea) {
            // 递归得到一个包含bounds和path的一维数组
            var temp = [],
                reConfigNodes = _getAreas($.fn.zTree.getZTreeObj(id).getNodes()),
                screenBounds = reConfigNodes[0].bounds,
                centerPoint = {
                    x: originArea.x * screenBounds.x2 + originArea.w * screenBounds.x2 / 2,
                    y: originArea.y * screenBounds.y2 + originArea.h * screenBounds.y2 / 2
                },
            // 过滤出包含框选中心点并且有文字属性的子节点控件
                filterNodes = _.filter(reConfigNodes, function(node) {
                    return centerPoint.x >= node.bounds.x1 &&
                        centerPoint.x <= node.bounds.x2 &&
                        centerPoint.y >= node.bounds.y1 &&
                        centerPoint.y <= node.bounds.y2 && !node.node.node &&
                        (node.node._text || node.node._description || node.node._placeholder)
                });

            // 如果未过滤出符合条件的节点,则取个面积最小的节点
            if (_.isEmpty(filterNodes)) {
                filterNodes = [_.minBy(reConfigNodes, function(node) {
                    return (node.bounds.x2 - node.bounds.x1) * (node.bounds.y2 - node.bounds.y1)
                })];
            }

            return _.map(filterNodes, function(node, index) {
                return {
                    id: index,
                    content: node.node._text || node.node._description || node.node._placeholder || "",
                    path: _getAbsolutePath(node),
                    w: node.bounds.x2 - node.bounds.x1,
                    h: node.bounds.y2 - node.bounds.y1
                }
            });

            function _getAreas(nodes) {
                if (_.isEmpty(nodes)) return;
                for (var i = 0, l = nodes.length; i < l; i++) {
                    temp.push({bounds: service.getBoundValue(nodes[i]._bounds), path: nodes[i].getPath(), node: nodes[i]});
                    _getAreas(nodes[i].node);
                }
                return temp;
            }

            function _getAbsolutePath(node) {
                return "/hierarchy/" + _.map(node.path, function(n) {
                        return "node[" + ( parseInt(n._index) + 1) + "]";
                    }).join("/");
            }
        }

        function initLayout(url) {
            return _getXmlLayout(url).then(function(res) {
                return {
                    layoutUrl: url,
                    xmlLayout: res
                };
            });
        }

        function _getXmlLayout(url) {
        //    url = url ? url : "components/layout/layout.xml"

            if (!url) {
                return $q.when('');
            }
            return DataService.crossGet(url, {ignoreErrAlert: true}).then(function (data) {
                return data;
            });
        }
    }

    function layoutTree() {
        return {
            link: function (scope, element) {
                var x2js = new X2JS({
                    attributePrefix: "_", arrayAccessFormPaths: [/.*./]
                }),
                    setting = {
                        view: {
                            selectedMulti: false,
                            nameIsHTML: true,
                            showIcon: false,
                            showLine: false,
                            fontCss: {
                                "font-size": "14px",
                                "color": "#333"
                            }
                        },
                        data: {
                            key: {
                                name: "name",
                                children: "node"
                            }
                        },
                        callback: {
                            onClick: _onClick
                        }
                    },
                    hierarchy,
                    tree;

                scope.$on("init:layout", function () {
                    init();
                });

                scope.$on("selected.xmlNode", function(e, bounds){
                    var selectedNode = tree.getNodesByParam("_bounds", bounds, null);
                    selectedNode && tree.selectNode(selectedNode[selectedNode.length - 1]);
                });

                function init() {

                    hierarchy = x2js.xml_str2json(scope.ctrl.xml);

                    var nodes = hierarchy.hierarchy.node;

                    if (_.isEmpty(nodes)) {
                        scope.ctrl.xml = undefined;
                        return;
                    }

                    _reconfigure(nodes);

                    tree = $.fn.zTree.init(element, setting, nodes);
                    tree.expandAll(true);

                    scope.$emit('create.xmlLayout', hierarchy.hierarchy._bounds, nodes || []); // 2个参数表示绘制所有layout
                }

                function _onClick(event, id, node) {
                    scope.$apply(function () {
                        _afterClick(node);
                        scope.$emit('create.xmlLayout', hierarchy.hierarchy._bounds); // 1个参数表示绘制当前点击的layout
                    });
                }

                function _reconfigure(nodes) {
                    if (_.isEmpty(nodes)) return;
                    var temp,
                        text;
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        temp = nodes[i];
                        if (_.isEmpty(temp._text)) {
                            temp.name = temp._class;
                        } else {
                            text = temp._text;
                            temp.name = temp._class + " (" + (text.length > 10 ? text.substr(0, 10) + "..." : text) + ")";
                        }
                        _reconfigure(temp.node);
                    }
                }

                function _afterClick(node) {
                    scope.ctrl.layoutProps = [];
                    _.each(node, function (value, key) {
                        if (_.startsWith(key, "_")) {
                            var obj = {};
                            obj[key.substring(1)] = value;
                            scope.ctrl.layoutProps.push(obj);
                        }
                    });
                    scope.ctrl.layoutProps.sort(function (obj1, obj2) {
                        var key1 = _.keys(obj1)[0],
                            key2 = _.keys(obj2)[0];

                        if (key1 < key2) {
                            return -1;
                        } else if (key1 > key2) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                }
            }
        };
    }

    function tbLayoutArea($compile) {
        return {
            link: function (scope) {
                var deviceScreen,
                    $container = $('<div class="layout-container" ng-show="isShowLayout"><div class="layout-wrap"></div><div class="layout-area"></div></div>'),
                    $area = $container.find(".layout-area"),
                    $parent, $canvas;

                $container.on("mouseover", function() {
                    $area.css("display", "none");
                });

                $compile($container)(scope);

                scope.$on("create.xmlLayout", function(e, bounds, nodes) {
                    if (bounds) {
                        $area.css("display","none");

                        deviceScreen = bounds;
                        _renderLayoutArea(nodes);
                    }
                });


                function _renderLayoutArea(nodes) {

                    $parent = $parent || $("device-screen").append($container);
                    $canvas = $canvas || $parent.find("#screen-canvas");
                    var layoutAreas = [];

                    var w = $canvas.width(),
                        h = $canvas.height(),
                        screen = getValue(deviceScreen),
                        ratioX = screen.x2 / w,
                        ratioY = screen.y2 / h;

                    $container.width(w).height(h);

                    if (nodes) {
                        var bounds,
                            $wrap = $container.find(".layout-wrap");

                        $wrap.empty().off().on("mouseover", '.layout-areas', function() {
                            scope.$broadcast("selected.xmlNode", $(this).data("bounds"));
                        });

                        _getAreas(nodes);
                        var domStr = _.chain(layoutAreas)
                            .orderBy('area', 'desc')
                            .map('dom').join('').value();
                        $(domStr).appendTo($wrap);
                    } else {
                        var currentLayout = _.find(scope.ctrl.layoutProps, function(prop) {
                                return _.keys(prop)[0] == "bounds";
                            });
                        if(!currentLayout) return;
                        var currentLayoutBounds = getValue(currentLayout.bounds);

                        $area.css({
                            left: currentLayoutBounds.x1 / ratioX + 'px',
                            top: currentLayoutBounds.y1 / ratioY + 'px',
                            width: (currentLayoutBounds.x2 - currentLayoutBounds.x1) / ratioX + 'px',
                            height: (currentLayoutBounds.y2 - currentLayoutBounds.y1) / ratioY + 'px',
                            display: "block"
                        });
                    }

                    function _getAreas(nodes) {
                        if (_.isEmpty(nodes)) return;
                        for (var i = 0, l = nodes.length; i < l; i++) {
                            bounds = getValue(nodes[i]._bounds);
                            var left = bounds.x1 / ratioX,
                                top = bounds.y1 / ratioY,
                                width = (bounds.x2 - bounds.x1) / ratioX,
                                height = (bounds.y2 - bounds.y1) / ratioY,
                                area = {
                                    dom: '<div class="layout-areas" data-bounds="' +
                                        nodes[i]._bounds + '"' +
                                        'style="left:' + left + 'px;' +
                                        'top:' + top + 'px;' +
                                        'width:' + width + 'px;' +
                                        'height:' + height + 'px;"' +
                                        '></div>',
                                    area: width * height
                                };
                            layoutAreas.push(area);
                            _getAreas(nodes[i].node);
                        }
                    }
                }

                function getValue(bounds) {
                    var v1 = bounds.substring(bounds.indexOf("[") + 1, bounds.indexOf("]")),
                        v2 = bounds.substring(bounds.lastIndexOf("[") + 1, bounds.lastIndexOf("]"));

                    return {
                        x1: v1.split(",")[0],
                        y1: v1.split(",")[1],
                        x2: v2.split(",")[0],
                        y2: v2.split(",")[1]
                    };
                }

                scope.$on("area:resize", function(){
                    deviceScreen && _renderLayoutArea();
                });
            }
        };
    }

    function layoutCtrl($rootScope, $scope, SocketService, StfService, LayoutService, spinner) {
        var ctrl = this;
        $rootScope.isShowLayout = ctrl.isShowLayout = true;
        ctrl.isDump = true;
        ctrl.isFastMode = true;
        ctrl.isIos = $scope.deviceType == 'ios';
        ctrl.switchLayout = switchLayout;
        ctrl.changeIsDump = changeIsDump;
        ctrl.changeDumpMode = changeDumpMode;

        $scope.$on("device:apply", function () {
            ctrl.refreshLayout = StfService.getClient().options.control.refresh;
            SocketService.getSocket().on("gesture.layout", function (res) {
                spinner.hide(); //点击home或refresh键页面会转圈，同时会刷新xml树，所以这里隐藏spinner
                var url = JSON.parse(res.body).href;
                if (!/^http/.test(url)) {
                    url = LayoutService.getHost() + url;
                }
                _initLayout(url);
            });
        });

        $(window).on('resize', _notifySnapshotResize);
        $scope.$on("$destroy", function () {
            $(window).off('resize', _notifySnapshotResize);
        });

        function _notifySnapshotResize() {
            $scope.$broadcast("area:resize");
        }

        function switchLayout() {
            $rootScope.isShowLayout = ctrl.isShowLayout = !ctrl.isShowLayout;
            if (ctrl.xml && ctrl.isShowLayout) {
                $scope.$broadcast("init:layout");
            }
        }
        
        function changeIsDump() {
            $scope.control.iosChangeIsDump({enable: ctrl.isDump});
        }
        
        function changeDumpMode() {
            $scope.control.iosChangeDumpMode({type: ctrl.isFastMode ? 0 : 1});
        }

        function _initLayout(url) {
            LayoutService.initLayout(url).then(function(res) {
                ctrl.xml = res.xmlLayout;
                ctrl.isShowLayout && $scope.$broadcast("init:layout");
            }, function() {
                ctrl.xml = undefined;
            });
        }
    }
})();

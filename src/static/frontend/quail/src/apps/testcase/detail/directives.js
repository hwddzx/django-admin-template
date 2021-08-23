(function() {
    angular.module("quail.testcases")
        .directive("tbParameterCell", tbParameterCell)
        .directive("xmlLayoutTree", xmlLayoutTree)
        .directive("imgPosition", imgPosition);

    function tbParameterCell() {
        return {
            restrict: 'C',
            link: function(scope, element, attrs) {
                var $label = $(element).find("label"),
                    $input = $(element).find("input");

                element.on("click", "label", function() {
                    $label.hide();
                    $input.show();
                    $input.focus();
                });

                element.on("blur", "input", function() {
                    $label.show();
                    $input.hide();
                });

            }
        }
    }

    function xmlLayoutTree() {
        return {
            restrict: 'AE',
            link: function(scope, element, attrs) {

                scope.$on("snapshot:reload", function() {
                    init();
                });

                scope.$watch("vm.isShowXmlJsonPanel", function(newVal) {
                    if (newVal) {
                        init();
                    }
                });

                function init() {

                    if (scope.vm.snapshot.hasOwnProperty("componentName")) return;

                    var x2js = new X2JS({
                            attributePrefix: "_", arrayAccessFormPaths: [/.*./]
                        }),
                        hierarchy = x2js.xml_str2json(scope.vm.xml),
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
                        nodes = hierarchy.hierarchy && hierarchy.hierarchy.node;

                    if (_.isEmpty(nodes)) {
                        scope.vm.xml = undefined;
                        return;
                    }

                    var rectCandidates = scope.vm.snapshot.rectCandidates;

                    _reconfigure(nodes);

                    _.each(rectCandidates, function(candidate, index) {
                        _overlapControl(candidate.xPath, index);
                    });

                    var treeObj = $.fn.zTree.init(element, setting, nodes),
                        node = treeObj.getNodes()[0];

                    treeObj.selectNode(node);
                    treeObj.expandAll(true);

                    _heightLight();

                    scope.$emit('node.afterClick', node);
                    scope.$emit('create.xmlLayout', hierarchy.hierarchy._bounds);

                    function _onClick(event, id, node) {
                        scope.$apply(function() {
                            scope.$emit('node.afterClick', node);
                            scope.$emit('create.xmlLayout', hierarchy.hierarchy._bounds);
                        })
                    }

                    function _reconfigure(nodes) {
                        if (_.isEmpty(nodes)) return;
                        var temp = undefined,
                            text = undefined;
                        for (var i = 0, l = nodes.length; i < l; i++) {
                            temp = nodes[i];
                            if (_.isEmpty(temp["_text"])) {
                                temp.name = temp["_class"];
                            } else {
                                text = temp["_text"] || temp["content-desc"] || "";
                                temp.name = temp["_class"] + " (" + (text.length > 10 ? text.substr(0, 10) + "..." : text) + ")";
                            }
                            _reconfigure(temp["node"]);
                        }
                    }

                    // 通过增加isOverlapControl属性标识重叠控件
                    function _overlapControl(xPath, index) {
                        var prefix = "/hierarchy/",
                            arr = xPath.substring(prefix.length).split("/"),
                            temp = nodes;
                        _.each(arr, function(a, i) {
                            if (a.indexOf("[") > 0) {
                                temp = temp[a.match(/\d+/) - 1]; // xPath的下标从1开始,对应json下标要-1
                            } else {
                                temp = temp[0];
                            }
                            // 最后一次就是要获取的节点,不需要再往下找node
                            if (i + 1 < arr.length) {
                                temp = temp["node"];
                            }
                        });

                        temp.isOverlapControl = true;
                        temp["name"] = temp["name"] + " [可选控件-" + (index + 1) + "]";
                    }

                    // 在xml-tree中突出显示重叠控件节点
                    function _heightLight() {
                        var overlapControls = treeObj.getNodesByParam("isOverlapControl", true, null);
                        _.each(overlapControls, function(o) {
                            $("#" + o.tId + "_span").css({"padding": "0 2px", "border": "1px dotted #0070f0"});
                        });
                    }
                }
            }
        }
    }

    function imgPosition() {
        return {
            link: function (scope, element) {
                var $position = $(".js-position"),
                    $positionX = $position.find(".js-position-x"),
                    $positionY = $position.find(".js-position-y");
                element.off("mousemove").on("mousemove", function(e) {
                    $positionX.text((e.offsetX / element.width()).toFixed(2));
                    $positionY.text((e.offsetY / element.height()).toFixed(2));
                })
            }
        }
    }

})();
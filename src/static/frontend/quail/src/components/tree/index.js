(function() {
    angular.module("quail.tree", [])
        .directive("tbTree", tbTree)
        .directive("tbZTree", tbZTree);

    function tbTree(TESTCASE_ENUM) {
        return {
            scope: {
                setting: '=',
                nodes: '=',
                notLinkage: '@'
            },
            link: function(scope, element, attrs) {
                var zTree,
                    nodes;

                scope.$watch('nodes', _init);

                function _init() {
                    _.each(scope.nodes, function(node) {
                        node.isParent = node.type == TESTCASE_ENUM.type.scenario;
                    });
                    $.fn.zTree.init(element, scope.setting, scope.nodes);
                }

                if(scope.notLinkage) return;
                // rentModal选择用例的时候,点击文字也能选中
                $(element).on("click.clickSpanToCheckCheckbox", "a[treenode_a]", function(e) {
                    e.stopPropagation();
                    $(this).siblings("span[treenode_check]").click();
                });
            }
        }
    }

    function tbZTree($timeout, DialogService, TESTCASE_ENUM, COMPONENT_ENUM) {
        return {
            scope: {
                nodes: '=',
                setting: '='
            },
            link: function(scope, element) {
                /**
                 * scope.setting 除原有功能外，额外接受参数
                 *      {
                 *          initSelectNodeID: //初始化时选中ID
                 *          hideRemoveBtn: true //在hideEdit不为true下不显示removeBtn
                 *          noDeleteConfirm: true //默认为false，为true删除时不弹窗提示
                 *          ignoreDeletedAlert: boolean //需要默认选中的用例已经被删除时,是否需要提示用户.默认值 undefined,为true时忽略.
                 *      }
                 * **/
                var zTree = '',
                    maxVersion,
                    setting = {
                        data: {
                            key: {
                                title: "",
                                name: "displayName"
                            },
                            simpleData: {
                                enable: true,
                                idKey: "id",
                                pIdKey: "parent_id",
                                rootPId: "1"
                            }
                        },
                        callback: {
                            beforeDrag: _beforeDrag,
                            beforeDrop: _beforeDrop,
                            beforeRemove: _beforeRemove,
                            onDrop: _onDrop,
                            onClick: _onClick,
                            onCheck: _onCheck
                        },
                        edit: {
                            enable: true,
                            showRenameBtn: false,
                            showRemoveBtn: _showRemoveBtn,
                            drag: {
                                inner: _dropInner
                            }
                        },
                        view: {
                            nameIsHTML: true,
                            showIcon: true,
                            showLine: false,
                            showTitle: _showTitleForTree,
                            fontCss: {
                                "font-size": "14px",
                                "color": "#333"
                            },
                            addDiyDom: _addDiyDom
                        }
                    };
                _.merge(setting, scope.setting);

                scope.$watch('nodes', function(newNodes) {
                    var maxVersionNode = _.maxBy(newNodes, 'version');
                    maxVersionNode && (maxVersion = maxVersionNode.version);
                    //当更新时重置默认选中用例
                    if (zTree) {
                        var node = zTree.getSelectedNodes()[0];
                        setting.initSelectNodeID = _.find(newNodes, {id: node.id}) ? node.id : node.parent_id;
                    }
                    _init();
                });

                //事件
                function _onDrop(event, id, nodes, target, moveType) {
                    var param = {};
                    switch (moveType) {
                        case "prev":
                            param["move_to_sibling_id"] = target.id;
                            param["move_to_sibling_position"] = "left";
                            param["node_parent_id"] = target.parent_id;
                            break
                        case "next":
                            param["move_to_sibling_id"] = target.id;
                            param["move_to_sibling_position"] = "right";
                            param["node_parent_id"] = target.parent_id;
                            break
                        case "inner":
                            param["parent_id"] = target.id
                            break
                    }
                    if (moveType) {
                        param.ids = _.map(nodes, 'id');
                        _initChildrenCount(zTree.getNodes()[0]);
                        scope.$emit('node.drop', param);
                    }
                }

                function _onClick(event, id, node) {
                    scope.$emit('node.afterClick', node);
                }

                function _onCheck() {
                    scope.$emit('node.checkChange');
                }

                //配置
                function _selectNode(tId) {
                    var node = zTree.getNodeByParam("id", tId);
                    if (!node) {
                        node = zTree.getNodes()[0];
                        if (_.isNumber(tId) && !setting.ignoreDeletedAlert) {
                            DialogService.error("用例已删除");
                        }
                    }
                    zTree.selectNode(node);
                    scope.$emit('node.afterClick', node);
                }

                function _beforeDrag(treeId, treeNodes) {
                    if (_.find(scope.nodes, {id: treeNodes[0].id}).permission == "查看") return false;
                }

                function _beforeDrop(event, nodes, target, moveType) {
                    if (_.find(scope.nodes, {id: target.id}).permission == "查看") {
                        DialogService.alert('不允许移到没有权限的场景中');
                        return false;
                    }

                    if (!target.parentTId && moveType != 'inner') {
                        DialogService.alert('不允许移到根节点外');
                        return false;
                    }
                }

                function _dropInner(id, node, target) {
                    return target ? target.isParent : false;
                }

                function _showRemoveBtn(id, node) {
                    return !setting.hideRemoveBtn && node.level > 0;
                }

                function _showTitleForTree(treeId, treeNode) {
                    return !treeNode.children;
                }

                //操作
                function _init() {
                    zTree = $.fn.zTree.init(element, setting, scope.nodes)
                    zTree.expandNode(zTree.getNodes()[0], true, false, true)
                    $timeout(function() {
                        _initChildrenCount(zTree.getNodes()[0]);
                        scope.$emit('tree.inited', _getApi());
                        _selectNode(setting.initSelectNodeID)
                    })

                    function _getApi() {
                        return {
                            getSelectedNode: function() {
                                // single select default
                                return zTree.getSelectedNodes()[0];
                            },
                            addNode: function(parentNode, newNode) {
                                var node = zTree.addNodes(parentNode, newNode)[0];
                                this.selectNode(node.id, true);
                                if (node.type === TESTCASE_ENUM.type.scenario) {
                                    _initChildrenCount(node);
                                } else {
                                    _updateChildrenCount(node, 1)
                                }
                                return node;
                            },
                            getNodes: function() {
                                return zTree.getNodes();
                            },
                            removeNode: function(node) {
                                zTree.removeNode(node);
                                _updateChildrenCount(node, node.isParent ? -node.childrenCount : -1);
                                return this.selectNode(node.parent_id);
                            },
                            getNodeByParam: function(key, value, parentNode) {
                                return zTree.getNodeByParam(key, value, parentNode);
                            },
                            updateNode: function(params) {
                                var updateNode = zTree.getNodesByParam("id", params.id)[0];
                                var updateIndex = _.findIndex(scope.nodes, function(node) {
                                    return node.id == params.id;
                                })
                                _.merge(scope.nodes[updateIndex], params);
                                _.merge(updateNode, params);
                                zTree.updateNode(updateNode);
                                _updateDisplayName(updateNode);
                                _updateNodeIcon(updateNode);
                                return updateNode
                            },
                            checkNode: function(node) {
                                zTree.checkNode(node, !node.checked, true)
                            },
                            getCheckedNodes: function() {
                                return zTree.getCheckedNodes(true);
                            },
                            getParentNode: function() {
                                var currentTreeNode = this.getSelectedNode()
                                return currentTreeNode.isParent ? currentTreeNode : currentTreeNode.getParentNode()
                            },
                            selectNode: _selectNode
                        }
                    }
                }

                function _addDiyDom(id, node) {
                    _updateNodeIcon(node);
                }

                function _updateNodeIcon(node) {
                    var $iconParam,
                        $permissionText,
                        $node,
                        iconParamHtml = "<span class='button icon-param'></span>",
                        permissionHtml = "<span class='permission-text'>(可编辑)</span>";

                    if (node.type == TESTCASE_ENUM.type.scenario && node.permission == "修改") {
                        $node = $("#" + node.tId + "_span");
                        $permissionText = $node.next(".permission-text");
                        if (!$permissionText.length) {
                            $node.after(permissionHtml);
                        }
                    }

                    if (node.type == TESTCASE_ENUM.type.case) {
                        $node = $("#" + node.tId + "_span");
                        $iconParam = $node.next(".icon-param");
                        if (node.expanding_dim) {
                            if (!$iconParam.length) {
                                $node.after(iconParamHtml);
                            }
                        } else {
                            if ($iconParam.length) {
                                $iconParam.remove();
                            }
                        }
                        maxVersion && node.version == maxVersion ? $node.addClass('latest-import-testcase') : $node.removeClass('latest-import-testcase');
                    }
                }

                function _beforeRemove(id, node) {
                    if (scope.setting.noDeleteConfirm) {
                        _delete();
                    } else {
                        DialogService.confirm("您确定删除吗?").then(_delete);
                    }
                    return false;

                    function _delete() {
                        scope.$emit('node.beforeDelete', node, function() {
                            zTree.removeNode(node);
                            _updateChildrenCount(node, node.isParent ? -node.childrenCount : -1);
                            zTree.getSelectedNodes().length || _selectNode(node.parent_id);
                        });
                    }
                }

                //数据配置
                function _initChildrenCount(node) {
                    node.childrenCount = 0;
                    if (node.children) {
                        _.each(node.children, function(c) {
                            if (c.type === TESTCASE_ENUM.type.scenario) {
                                _initChildrenCount(c)
                                node.childrenCount += c.childrenCount;
                            } else {
                                node.childrenCount += 1;
                            }
                        })
                    }
                    _updateDisplayName(node)
                }

                function _updateChildrenCount(node, inc) {
                    _updateDisplayName(node);
                    while (node = node.getParentNode()) {
                        node.childrenCount += inc;
                        _updateDisplayName(node);
                    }
                }

                function _updateDisplayName(node) {
                    if (node.type == COMPONENT_ENUM.type.directory) {
                        node.isParent = true;
                        node.nocheck = true;
                        node.displayName = node.name + "(" + node.childrenCount + ")";
                    }
                    zTree.updateNode(node);
                }
            }
        }
    }

})();

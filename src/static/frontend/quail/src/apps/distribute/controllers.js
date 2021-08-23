(function() {
    angular.module("distribute")
        .controller("DistributeCtrl", DistributeController)
        .controller("GatherCtrl", GatherController)
        .controller("EditGatherCtrl", EditGatherController)
        .controller("MemberManagementCtrl", MemberManagementController);

    function DistributeController($scope, $state, $stateParams, $filter, $uibModal, TaskService, DistributeService, ReportService, RentModalService, ModalService, LayoutService, TESTCASE_ENUM, RENT_MODAL_STEP, appInfo, releases) {
        var vm = this,
            currentGather = DistributeService.getCurrentGather(),
            currentType = DistributeService.getCurrentType();

        vm.appInfo = appInfo;
        vm.chooseRelease = chooseRelease;
        vm.type = 1; // 1 录制,0 功能测试

        vm.nodes = [];
        vm.zTree = "";

        vm.isOwner = localStorage.getItem("role") == "owner";

        vm.selectedExecutionIds = []; // 选中的execution的ID
        vm.report = {
            name: $scope.app.name + "任务分发报告(" + $filter('date')(new Date(), 'yyyy-MM-dd') + ")",
            desc: "",
            executions: []
        };

        vm.selectedGather = selectedGather;
        vm.switchType = switchType;
        vm.gatherModal = gatherModal;
        vm.editGather = editGather;
        vm.redistribute = redistribute;
        vm.look = look;
        vm.execute = execute;
        vm.createReport = createReport;

        vm.releases = releases;
        vm.release = DistributeService.currentRelease() || releases[releases.length - 1];
        getGathers();

        // 选择用例集
        function selectedGather(currentGather) {
            vm.currentGather = currentGather;

            if (!vm.findGather || currentType == undefined || currentType == 1) {
                vm.type = 1;
            } else {
                vm.type = 0;
            }

            var cancelSelectedGather = _.find(vm.gathers, function(gather) {
                return gather.selected == true;
            });
            cancelSelectedGather && (cancelSelectedGather.selected = false);

            var selectedGather = _.find(vm.gathers, function(gather) {
                return gather.id == vm.currentGather.id;
            });
            selectedGather && (selectedGather.selected = true);

            DistributeService.setCurrentGather(selectedGather);
            getGatherExecutions(vm.currentGather.id, vm.type);
        }

        // 切换脚本录制和自助功能测试
        function switchType(type) {
            vm.type = _.isUndefined(type) ? vm.type : type;
            vm.selectedExecutionIds = [];
            DistributeService.setCurrentType(vm.type);
            getGatherExecutions(vm.currentGather.id, vm.type);
        }

        // 获取当前用例集用例
        function getGatherExecutions(gatherKey, type) {
            DistributeService.getGatherExecutions(gatherKey, {type: type, isTester: vm.isOwner ? 0 : 1}).then(function(data) {
                vm.nodes = data;
                _initExecutionTree();
            });
        }

        // 创建用例集或分配任务modal
        function gatherModal(isCreate) {
            $uibModal.open({
                templateUrl: "apps/distribute/templates/case.gather.html",
                resolve: {
                    testcases: function(TestCaseService) {
                        return isCreate ? TestCaseService.getTestCases(vm.appInfo.key) : DistributeService.getTestCases(vm.currentGather.id).then(function(data) {
                            return data.testcases;
                        });
                    },
                    model: function() {
                        return {
                            isCreate: isCreate,
                            app: vm.appInfo,
                            gather: vm.currentGather,
                            type: vm.type,
                            release: vm.release
                        }
                    }
                },
                controllerAs: "vm",
                controller: "GatherCtrl"
            })
        }

        // 编辑用例集modal
        function editGather() {
            $uibModal.open({
                templateUrl: "apps/distribute/templates/edit.case.gather.html",
                resolve: {
                    testcases: function(TestCaseService) {
                        return TestCaseService.getTestCases(vm.appInfo.key).then(function(data) {
                            return data;
                        });
                    },
                    gatherCases: function() {
                        return DistributeService.getTestCases(vm.currentGather.id).then(function(data) {
                            return data.testcases;
                        });
                    },
                    model: function() {
                        return {
                            app: vm.appInfo,
                            gather: vm.currentGather,
                            type: vm.type
                        }
                    }
                },
                controllerAs: "vm",
                controller: "EditGatherCtrl"
            })
        }

        // 为execution重新分配tester
        function redistribute() {
            $uibModal.open({
                templateUrl: "apps/distribute/templates/redistribute.modal.html",
                resolve: {
                    model: function() {
                        return {
                            gather: vm.currentGather,
                            members: vm.appInfo.members,
                            selectedExecutionIds: vm.selectedExecutionIds
                        }
                    }
                },
                controllerAs: "vm",
                controller: function($scope, $state, $uibModalInstance, DistributeService, model) {
                    var vm = this;

                    vm.members = model.members;
                    vm.isHidePanel = true;

                    vm.selectedMember = selectedMember;
                    vm.change = change;
                    vm.save = save;
                    vm.cancel = cancel;

                    function selectedMember(member) {
                        vm.member = member;
                        vm.isHidePanel = true;
                    }

                    function change() {
                        vm.isHidePanel = false;
                    }

                    function save() {
                        DistributeService.redistributeExecutions(model.gather.id, {
                            tester: vm.member,
                            executions: model.selectedExecutionIds
                        }).then(function() {
                            $state.reload();
                        });
                        $uibModalInstance.dismiss();
                    }

                    function cancel() {
                        $uibModalInstance.close();
                    }
                }
            })
        }

        // 查看
        function look($event) {
            $event.stopPropagation();
        }

        // 执行
        function execute($event, executionId) {
            $event && $event.stopPropagation();

            var task = {
                desc: "",
                type: vm.type,
                isDistribute: true
            };

            RentModalService.open({
                task: task,
                app: $scope.app,
                needTestcase: false,
                step: RENT_MODAL_STEP.chooseDevice,
                needChooseDevice: true
            }).then(function() {
                var device = task.device[0],
                    params = {
                        "device_key": device.key,
                        "os": device.os,
                        "manufacturer": device.manufacturer,
                        "screen_width": device.screen_width,
                        "screen_length": device.screen_length,
                        "duration": task.duration
                    };
                if (executionId) {
                    task.testcases = [_getTreeObj().getNodeByParam("id", executionId)];
                } else {
                    // 批量执行才需要append_execution_ids参数
                    params.append_execution_ids = vm.selectedExecutionIds;
                    task.testcases = _.chain(_getTreeObj().getCheckedNodes(true)).filter({testcase_type: TESTCASE_ENUM.type.case}).value();
                    executionId = task.testcases[0].id; // 批量执行时用第一个execution.id请求
                }

                task.originName = $scope.app.name;

                // 第一次发起startDistributeTask请求才需要params
                TaskService.startDistributeTask(executionId, params).then(function(data) {
                    LayoutService.setHost('http://' + data.device.public_ip + ':' + data.device.port);
                    //task.append_execution_ids = vm.selectedExecutionIds;
                    $state.go("stf", {
                        app: $scope.app,
                        task: _.extend(task, data, {remainTime: task.duration}),
                        appKey: $scope.app.key,
                        taskType: vm.type
                    });
                });
            });

        }

        // 生成报告
        function createReport() {
            vm.report.executions = vm.selectedExecutionIds;

            if (vm.report.executions.length) {
                ModalService.show({
                    templateUrl: "apps/report/templates/report.modal.html",
                    model: vm.report
                }).then(function(model) {
                    ReportService.saveReport($stateParams.key, vm.report).then(function() {
                        $state.go('^.reports', {
                            reload: true
                        });
                    })
                });
            }
        }

        // 初始化用例集Executions列表
        function _initExecutionTree() {

            //场景节点都设置为父节点
            angular.forEach(vm.nodes, function(node) {
                // 展开的node才能被当做DiyDom编译
                node.open = true;
                if (node.type == TESTCASE_ENUM.type.scenario) {
                    node.isParent = true;
                } else {
                    node.isParent = false;
                }

                if (!vm.isOwner && node.status >= 10) {
                    node.chkDisabled = true;
                }
            });

            vm.setting = {
                check: {
                    enable: vm.isOwner || vm.type == 0
                },
                data: {
                    simpleData: {
                        enable: true,
                        idKey: "testcase_id",
                        pIdKey: "testcase_parent_id"
                    },
                    key: {
                        name: "testcase_name"
                    }
                },
                view: {
                    showIcon: true,
                    showTitle: false,
                    showLine: false,
                    dblClickExpand: false,
                    fontCss: _getFontCss,
                    addDiyDom: _addDiyDom
                },
                callback: {
                    onClick: function(event, treeId, treeNode) {
                        _getTreeObj().expandNode(treeNode);
                        if (!treeNode.isParent) {
                            $state.go("^.testcases", {selectNodeId: treeNode.testcase_id})
                        }
                    },
                    onCheck: function() {
                        $scope.$apply(function() {
                            vm.selectedExecutionIds = _.chain(_getTreeObj().getCheckedNodes(true)).filter({testcase_type: TESTCASE_ENUM.type.case}).map("id").value();
                        });
                    }
                }
            };

            $scope.$broadcast("buildTreeTable");

        }

        function _addDiyDom(treeId, treeNode) {
            var $treeNode,
                hashkey = treeNode.hashkey,
                status = treeNode.status >= 10 ? '完成' : '未完成',
                html = "<div class='tree-column-wrap'>" +
                    "<span class='tree-column'>" + treeNode.tester + "</span>" +
                    "<span class='tree-column'>" + $filter("dateFilter")(treeNode.distribute_time, "yyyy-MM-dd") + "</span>" +
                    "<span class='tree-column'>" + $filter("dateFilter")(treeNode.completed_time, "yyyy-MM-dd") + "</span>" +
                    "<span class='tree-column'>" + status + "</span>";
            if (vm.type == 0) {
                html += treeNode.status >= 10 ? "<a class='tree-column link' target='_blank' ng-click='vm.look($event)' ui-sref='executionDetail({hashkey: \"" + hashkey + "\", canChangeCompare: true})'>查看</a>" : "<span class='tree-column'>-</span>";
            }

            if (!vm.isOwner) {
                html += treeNode.status < 10 ? "<a class='tree-column link' ng-click='vm.execute($event, " + treeNode.id + ")'>执行</a>" : "<span class='tree-column'>-</span>";
            }
            html += "</div>";

            if (treeNode.testcase_type == TESTCASE_ENUM.type.case) {
                $treeNode = $("#" + treeNode.tId + "_span");
                $treeNode.after(html);
            }
        }

        function _getFontCss(treeId, treeNode) {
            return {
                "font-size": "14px",
                "color": "#191e25"
            };
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("testcase-tree1");
        }


        function chooseRelease(release) {
            vm.release = DistributeService.currentRelease(release);
            getGathers();
        }

        function getGathers() {
            DistributeService.getGathers(vm.release.id, {isTester: localStorage.getItem("role") == "owner" ? 0 : 1}).then(function(gathers) {
                vm.gathers = gathers;

                // 1.分配和重新分配之后要选中被分配的用例集 2.切换app之后选中第一个用例集
                vm.findGather = _.find(vm.gathers, function(gather) {
                    return currentGather && (gather.id == currentGather.id);
                });
                vm.currentGather = vm.findGather || vm.gathers[0];

                vm.gathers.length > 0 && selectedGather(vm.currentGather);
            })
        }

    }


    function GatherController($scope, $state, $uibModalInstance, DistributeService, TESTCASE_ENUM, TASK_ENUM, testcases, model) {
        var vm = this;

        vm.isCreate = model.isCreate;
        vm.app = model.app;
        vm.gather = model.gather;
        vm.type = model.type;
        vm.setting = {};
        vm.checkedCount = 0;
        vm.nodes = testcases;
        vm.isHidePanel = true;
        vm.inputValue = "";

        vm.toggleDistributedTestcase = toggleDistributedTestcase;
        vm.change = change;
        vm.selectedMember = selectedMember;
        vm.save = save;
        vm.cancel = cancel;

        function toggleDistributedTestcase() {
            var treeObj = _getTreeObj();
            var type = vm.type == 1 ? "is_distributed_record" : "is_distributed_manual";
            treeObj[vm.hideDistributeTestcase ? 'hideNodes' : 'showNodes'](treeObj.getNodesByParam(type, true, null));
            _resetCheckedCount();
        }


        function selectedMember(member) {
            vm.inputValue = member;
            vm.isHidePanel = true;
        }

        function change() {
            if (!vm.isCreate) {
                vm.isHidePanel = false;
            }
        }

        function save() {
            var params = {
                testcases: _.chain(_getTreeObj().getCheckedNodes(true)).filter({type: TESTCASE_ENUM.type.case}).map("id").value(),
                type: vm.type
            };
            if (vm.isCreate) {
                params.name = vm.inputValue;
                params.desc = "创建用例集";
                DistributeService.createGather(model.release.id, params).then(function(data) {
                    DistributeService.setCurrentGather(data);
                    DistributeService.setCurrentType(TASK_ENUM.taskType.record);

                    $state.reload("app.distribute");
                })
            } else {
                params.tester = vm.inputValue;
                params.desc = "分配任务";
                DistributeService.distributeTask(model.release.id, vm.gather.id, params).then(function() {
                    $state.reload("app.distribute");
                })
            }
            $uibModalInstance.dismiss();
        }

        function cancel() {
            $uibModalInstance.close();
        }

        _initTree();

        function _initTree() {

            vm.hideDistributeTestcase = true;

            //根节点默认展开
            vm.nodes[0].open = true;
            //场景节点都设置为父节点
            angular.forEach(vm.nodes, function(node) {
                if (node.type == TESTCASE_ENUM.type.scenario) {
                    node.isParent = true;
                } else {
                    node.isParent = false;
                }
                // 隐藏分配过的testcase
                if ((vm.type == 0 && node.is_distributed_manual) || (vm.type == 1 && node.is_distributed_record)) {
                    node.isHidden = true;
                }
            });

            vm.setting = {
                check: {
                    enable: true
                },
                data: {
                    simpleData: {
                        enable: true,
                        pIdKey: 'parent_id'
                    }
                },
                view: {
                    showIcon: true,
                    showLine: false,
                    dblClickExpand: false,
                    fontCss: _getFontCss
                },
                callback: {
                    onClick: function(event, treeId, treeNode) {
                        _getTreeObj().expandNode(treeNode);
                    },
                    onCheck: function() {
                        $scope.$apply(function() {
                            _resetCheckedCount();
                        });
                    }
                }
            };

        }

        function _resetCheckedCount() {
            vm.checkedCount = _.filter(_getTreeObj().getCheckedNodes(true), {isParent: false}).length;
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("testcase-tree");
        }

        function _getFontCss(treeId, treeNode) {
            return {
                "font-size": "14px",
                "color": "#191e25"
            };
        }
    }

    function EditGatherController($scope, $state, $uibModalInstance, DistributeService, TESTCASE_ENUM, testcases, gatherCases, model) {
        var vm = this;

        vm.nodes = testcases;
        vm.model = _.cloneDeep(model);
        vm.checkedCount = 0;

        vm.save = save;
        vm.cancel = cancel;

        function save() {
            var testcases = _.chain(_getTreeObj().getNodesByParam("checked", true, null)).filter({type: TESTCASE_ENUM.type.case}).map("id").value();
            DistributeService.updateGather(vm.model.gather.id, {name: vm.model.gather.name, desc: '编辑用例集', testcases: testcases}).then(function() {
                $uibModalInstance.close();
                $state.reload("app.distribute");
            })
        }

        function cancel() {
            $uibModalInstance.close();
        }

        _initTree();

        function _initTree() {

            _.each(gatherCases, function(gatherCase, index) {
                gatherCase.checked = true;
                if (gatherCase.type == 0) {
                    vm.checkedCount++;
                }
                var temp = _.find(testcases, {id: gatherCase.id});
                if (temp) {
                    _.extend(temp, gatherCase);
                }
            });

            //根节点默认展开
            vm.nodes[0].open = true;
            //场景节点都设置为父节点
            angular.forEach(vm.nodes, function(node) {
                if (node.type == TESTCASE_ENUM.type.scenario) {
                    node.isParent = true;
                } else {
                    node.isParent = false;
                }
                // 隐藏分配过的testcase
                if ((model.type == 0 && node.is_distributed_manual) || (model.type == 1 && node.is_distributed_record)) {
                    node.chkDisabled = true;
                }
            });

            vm.setting = {
                check: {
                    enable: true
                },
                data: {
                    simpleData: {
                        enable: true,
                        pIdKey: 'parent_id'
                    }
                },
                view: {
                    showIcon: true,
                    showLine: false,
                    dblClickExpand: false,
                    fontCss: _getFontCss
                },
                callback: {
                    onClick: function(event, treeId, treeNode) {
                        _getTreeObj().expandNode(treeNode);
                    },
                    onCheck: function() {
                        $scope.$apply(function() {
                            _resetCheckedCount();
                        });
                    }
                }
            };

        }

        function _resetCheckedCount() {
            vm.checkedCount = _.filter(_getTreeObj().getNodesByParam("checked", true, null), {isParent: false}).length;
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("edit-testcase-tree");
        }

        function _getFontCss() {
            return {
                "font-size": "14px",
                "color": "#191e25"
            };
        }
    }

    function MemberManagementController($state, $stateParams, DialogService, DistributeService, appInfo) {
        var vm = this,
            key = $stateParams.key;

        vm.appInfo = appInfo;
        vm.addMemberEmails = "";
        vm.memberList = _.map(vm.appInfo.members, function(member) {
            return {checked: false, member: member};
        });
        vm.nonexistentMembers = [];

        vm.addMembers = addMembers;
        vm.deleteMembers = deleteMembers;

        function addMembers() {
            if (!_.isEmpty(vm.addMemberEmails)) {
                DistributeService.addMembers(key, vm.addMemberEmails).then(function(data) {
                    vm.memberList = _.map(data.members_exist, function(member) {
                        return {checked: false, member: member};
                    });

                    vm.nonexistentMembers = data.members_not_exist;
                });
            }
        }

        function deleteMembers() {
            var members = _.chain(vm.memberList).filter({checked: true}).map("member").join(",").value();
            if (members) {
                DialogService.confirm("确定删除选中的成员吗?").then(function() {
                    DistributeService.deleteMembers(key, members).then(function() {
                        $state.reload("app.distribute-member-manage");
                    })
                })
            }
        }
    }
})();
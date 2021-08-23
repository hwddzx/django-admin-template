(function() {
    angular.module('quail.testcases')
        .controller("TestCasesCtrl", TestCasesController)
        .controller("ImportExecutionCtrl", ImportExecutionController)
        .controller("RegexpsTemplateCtrl", RegexpsTemplateController)
        .controller("TagController", TagController)
        .controller("TestcasesModalCtrl", TestcasesModalCtrl);

    function TestCasesController($scope, $stateParams, $state, $interval, $timeout, ModalService, DataService, TestCaseService, DialogService, TaskFactoryService, TagService, testcases, config, TESTCASE_ENUM) {
        var vm = this;

        vm.priorityDef = TESTCASE_ENUM.priority;

        vm.model = {
            isEdit: false,
            excelTemplateUrl: "/static/testcase/testcase_import_template.xls",
            testCase: {}
        };

        vm.appId = $stateParams.key;
        vm.testcases = testcases;
        vm.selectedNode = null;
        vm.isLab = config.isLab();
        vm.setting = {
            noDeleteConfirm: false,
            initSelectNodeID: $stateParams.selectNodeId
        };
        vm.testcaseType = TESTCASE_ENUM.type;
        vm.addTestcase = addTestcase;

        vm.status_0 = TESTCASE_ENUM.scriptStatus.none_script;
        vm.status_1 = TESTCASE_ENUM.scriptStatus.unfinished_debug;
        vm.status_2 = TESTCASE_ENUM.scriptStatus.finished_debug;

        vm.statusOptions = [{
            name: '全部', // all status
            debug: [
                { name: '全部', value: [true, false] },
                { name: "是", value: [true] },
                { name: "否", value: [false] }
            ],
            fastMode: [
                { name: '全部', value: [true, false] },
                { name: "是", value: [true] },
                { name: "否", value: [false] }
            ],
            value: [vm.status_0, vm.status_1, vm.status_2]
        }, {
            name: "是", // has script
            debug: [
                { name: '全部', value: [true, false] },
                { name: "是", value: [true] },
                { name: "否", value: [false] }
            ],
            fastMode: [
                { name: '全部', value: [true, false] },
                { name: "是", value: [true] },
                { name: "否", value: [false] }
            ],
            value: [vm.status_1, vm.status_2]
        }, {
            name: "否", // has no script
            debug: [
                { name: '全部', value: [true, false] }
            ],
            fastMode: [
                { name: '全部', value: [true, false] }
            ],
            value: [vm.status_0]
        }];

        vm.currentScriptStatus = vm.statusOptions[0];
        vm.currentDebugStatus = vm.currentScriptStatus.debug[0];
        vm.currentFastModeStatus = vm.currentScriptStatus.fastMode[0];
        vm.isFilterNoSetTag = false; // 过滤没有标签的用例

        vm.createRecordTask = createRecordTask;
        vm.updateTestCaseSubmitStatus = updateTestCaseSubmitStatus;
        vm.updateTestCaseFastMode = updateTestCaseFastMode;
        vm.downloadScript = downloadScript;
        vm.copyScript = copyScript;
        vm.setSnapshotsDefaultClickType = setSnapshotsDefaultClickType;
        vm.setSleep = setSleep;
        vm.getAllTags = getAllTags;
        vm.getTestcaseTags = getTestcaseTags;
        vm.setTags = setTags;
        vm.setTagsForTestCases = setTagsForTestCases;
        vm.filterTestCases = filterTestCases;
        vm.filterNoSetTagTestcase = filterNoSetTagTestcase;
        vm.exportExecuteResult = exportExecuteResult;
        vm.reloadPage = reloadPage;

        _init();

        function _initTreeDispalyData(testcase) {
            testcase.displayName = testcase.code + ": " + testcase.name;
            testcase.title = testcase.code + " " + testcase.name;
        }

        function _init() {
             _.each(vm.testcases.data, _initTreeDispalyData)

            $scope.$on('tree.inited', function(e, api) {
                vm.caseTreeApi = api;
            });
            $scope.$on('node.beforeDelete', function(e, node, callback) {
                e.stopPropagation();

                if (_.find(vm.testcases.data, {id: node.id}).is_distributed) {
                    DialogService.confirm("用例已被分配，确定删除?").then(function() {
                        vm.testcases.deleteData(node).then(callback)
                    })
                } else {
                    vm.testcases.deleteData(node).then(callback)
                }
            });

            $scope.$on('node.afterClick', function(e, node) {
                var temp = _.find(vm.testcases.filteredData, {id: node.id});
                vm.hasPermissionEdit = temp && temp.permission == "修改";
                vm.selectedNode = node;
                e.stopPropagation();
                return vm.testCaseDetail(node);
            });

            $scope.$on('node.drop', function(e, param) {
                e.stopPropagation();
                //更新移动后的用例的parent_id
                var data = vm.testcases.filteredData.slice(0)
                for(var i in data){
                    if(data[i].id == param.ids[0]){
                        if(param.parent_id){
                            vm.testcases.filteredData[i].parent_id = param.parent_id;
                        }else {
                            vm.testcases.filteredData[i].parent_id = param.node_parent_id;
                        }
                    }
                }
                if(param.node_parent_id){
                    delete param.node_parent_id
                }
                vm.testcases.move(param);
            });

            $scope.$on('testCase.onNodeChanged', function(event, testcase) {
                vm.caseTreeApi.updateNode(_pickNodeNeedParam(testcase));
            });

            $scope.$watch('vm.currentScriptStatus', function() {
                vm.currentDebugStatus = vm.currentScriptStatus.debug[0];
                vm.currentFastModeStatus = vm.currentScriptStatus.fastMode[0];
            });

            $scope.$watch('vm.currentDebugStatus', function() {
                vm.filterTestCases();
            });

            $scope.$watch('vm.currentFastModeStatus', function() {
                vm.filterTestCases();
            });
        }

        function addTestcase(type) {
            //添加之前先将标签过滤去掉，以免用例树中没有用例，导致新增用例时右边界面无法显示出用例界面
            var isFiltered = false
            _.forEach(vm.testcasesTags, function(tag) {
                if (tag.checked == true) {
                    isFiltered = true;
                    tag.checked = false;
                }
            });
            isFiltered && vm.filterTestCases('or');
            $timeout(function() {
                var parentNode = vm.caseTreeApi.getParentNode();
                vm.testcases.addNewData(type , parentNode.id).then(function(testcase) {
                    _initTreeDispalyData(testcase);
                    vm.caseTreeApi.addNode(parentNode, testcase);
                    vm.testCaseDetail(testcase).then(function() {
                        vm.editTestCase();
                    });
                });
            },200);
        }

        function _pickNodeNeedParam(data) {
            return  _.pick(data, ['id', 'name', 'title', 'displayName', 'expanding_dim'])
        }

        vm.scenarioSelected = function() {
            return vm.model.testCase.type == TESTCASE_ENUM.type.scenario;
        }

        vm.rootSelected = function() {
            return vm.model.level == 0;
        }

        vm.testCaseDetail = function(originTestcase) {
            vm.model.isEdit = false;
            return TestCaseService.getTestCase(originTestcase.id).then(function(data) {
                vm.model.testCase = data;
                vm.model.level = originTestcase.level;

                if (vm.model.testCase.status == TESTCASE_ENUM.status.recording) {
                    _pollingQueryTestcase(vm.model.testCase);
                }

                function _pollingQueryTestcase(testcase) {
                    if (vm.pollingTicket) {
                        $interval.cancel(vm.pollingTicket);
                    }
                    vm.pollingTicket = $interval(_queryTestcase, 5000, 50);

                    function _queryTestcase() {
                        TestCaseService.getTestCase(testcase.id).then(function(data) {
                            _.extend(testcase, data);
                            // 录制完脚本上传完成之后要在前端改变testcase的script_status才能正常过滤
                            _.extend(_.find(vm.testcases.data, { id: testcase.id }), data);
                            if (data.status !== TESTCASE_ENUM.status.recording) {
                                $interval.cancel(vm.pollingTicket);
                                vm.pollingTicket = null;
                            }
                        });
                    }
                }
                return vm.model.testCase;
            });
        };

        vm.editTestCase = function() {
            vm.clonedTestCase = $.extend(true, {}, vm.model.testCase);
            vm.model.isEdit = true;
        };

        vm.updateTestCase = function() {
            if(/[\/\\"<>\?\*]/gi.test(vm.clonedTestCase.name)){
                DialogService.alert('标题不能包含(\\/"<>?*)中任意字符');
            }else{
                var param = _.pick(vm.clonedTestCase, ['name', 'desc', 'pre_condition', 'expect_result', 'priority']),
                    currentTestcase = vm.model.testCase;
                TestCaseService.updateTestCase(currentTestcase.id, param).then(function() {
                    vm.clonedTestCase = "";
                    vm.model.isEdit = false;
                    _.extend(currentTestcase, param);
                    _initTreeDispalyData(currentTestcase);

                    _.extend(_.find(vm.testcases.data, function(testcase) {
                        return testcase.id == currentTestcase.id;
                    }), currentTestcase);

                    vm.caseTreeApi.updateNode(_pickNodeNeedParam(currentTestcase));
                });
            }
        };

        function createRecordTask(app, scriptTestcase) {
            if (vm.model.testCase.script_json.actions.length > 0) {
                DialogService.confirm('如果继续录制，若保存录制结果则会更新用例，若不保存直接结束录制则用例会恢复至原始状态，是否继续？').then(function() {
                    TaskFactoryService.createRecordTask(app, scriptTestcase);
                });
            } else {
                TaskFactoryService.createRecordTask(app, scriptTestcase);
            }
        }

        function updateTestCaseSubmitStatus() {
            vm.model.testCase.is_submitted = !vm.model.testCase.is_submitted;
            TestCaseService.updateTestCaseSubmitStatus(vm.model.testCase).then(function(){
                _.find(vm.testcases.data, ['id', vm.model.testCase.id]).is_submitted = vm.model.testCase.is_submitted;
            })
        }

        function updateTestCaseFastMode() {
            if (vm.model.testCase.status == 1) {
                return DialogService.error('录制结果上传中，无法修改脚本内容！');
            }
            vm.model.testCase.fast_mode = !vm.model.testCase.fast_mode;
            vm.model.testCase.script_json.fastMode = !vm.model.testCase.script_json.fastMode;
            TestCaseService.batchSaveSnapshots(vm.model.testCase).then(function() {
                _.find(vm.testcases.data, ['id', vm.model.testCase.id]).fast_mode = vm.model.testCase.fast_mode;
            });
        }

        /* testcase end */

        vm.exportExcel = function(app) {
            window.open("/api/testcase/app/" + app.key + "/export/excel/");
        };

        vm.importFromExcel = function($files) {
            if ($files.length > 0) {
                TestCaseService.importFromExcel(vm.appId, $files[0]).then(function(res) {
                    return DialogService.alert({message: res});
                }).then(function() {
                    $state.reload();
                });
            }
        };

        function copyScript() {
            ModalService.show({
                templateUrl: 'apps/testcase/templates/clone.execution.ignore.modal.html',
                model: {
                    desc: true,
                    pre_condition: true,
                    expect_result: true
                }
            }).then(function(model) {
                model.ignores = [];
                _.each(model, function(value, key) {
                    if(value === true) model.ignores.push(key);
                });
                return TestCaseService.copyScript(vm.model.testCase.id, {codeId: model.id, ignores: model.ignores});
            }).then(function(data) {
                $state.go("app.testcases", {selectNodeId: data.id}, {reload: true});
            });
        }

        function downloadScript(isExpand) {
            window.open("/api/testcase/" + vm.model.testCase.id + "/export/script/?expand=" + !!isExpand);
        }

        function setSnapshotsDefaultClickType(clickMode) {
            var tips = {0: "控件优先点击", 1: "坐标点击", 2: "控件强制点击"};
            DialogService.confirm("确定设置已录制图片默认点击规则为" + tips[clickMode] + "吗?").then(function() {
                _.each(vm.model.testCase.snapshots, function (snapshot) {
                    snapshot.clickMode = clickMode;
                });
                _.each(vm.model.testCase.script_json.actions, function (action) {
                    if (_.indexOf(TESTCASE_ENUM.snapshotActions, action.action) > -1) {
                        action.clickMode = clickMode;
                    }
                });

                return TestCaseService.batchSaveSnapshots(vm.model.testCase)
                    .then(function() {
                        DialogService.alert("成功设置已录制图片默认点击规则为:" + tips[clickMode]);
                    });
            })
        }

        function setSleep() {
            ModalService.show({
                templateUrl: 'apps/testcase/templates/sleep.modal.html',
                model: {
                    sleep: 0
                }
            }).then(function(model) {
                var re =  /^(0|\+?[1-9][0-9]*)$/;
                if (!re.test(model.sleep)) {
                    DialogService.alert("sleep值必须为正整数，请输入正整数！");
                    return;
                }
                vm.model.testCase.script_json.sleep = model.sleep;
                TestCaseService.batchSaveSnapshots(vm.model.testCase)
                    .then(function() {
                        DialogService.alert("成功设置已录制图片sleep时间为:" + model.sleep+",如果需要单独设置某一步sleep时间,请在该脚本添加fixedSleep字段");
                    });
            })
        }

        // 设置标签时获取所有标签
        function getAllTags() {
            TagService.getTags(vm.appId).then(function(data) {
                vm.tags = data;
                _.each(vm.tags, function(tag){
                    if (_.includes(vm.model.testCase.tags, tag.name)) {
                        tag.checked = true
                    }
                });
                if(_.isEmpty(vm.tags)){
                    DialogService.alert("未配置标签,请点击'标签配置',进行配置!")
                }
            })
        }

        // 获取所有用例的标签作为过滤条件
        function getTestcaseTags() {
            var temp = vm.testcasesTags;
            vm.testcasesTags = [];
            _.each(vm.testcases.data, function(testcase) {
                testcase.tags && (vm.testcasesTags = vm.testcasesTags.concat(testcase.tags));
            });

            vm.testcasesTags = _.chain(vm.testcasesTags).uniq().map(function(tag) {
                return {name: tag}
            }).each(function(tag) {
                _.each(temp, function(t) {
                    if (t.checked && tag.name == t.name) tag.checked = true;
                })
            }).value();
            if (vm.testcasesTags.length == 0) {
                DialogService.alert('请先设置标签！');
            }
        }

        function setTags() {
            var checkedTags = _.filter(vm.tags, {checked: true});
            TestCaseService.updateTestCase(vm.model.testCase.id, {tags: _.map(checkedTags, "key")}).then(function() {
                _.find(vm.testcases.data, {id: vm.model.testCase.id}).tags = vm.model.testCase.tags = _.map(checkedTags, "name");
            })
        }

        function setTagsForTestCases() {
            ModalService.show({
                templateUrl: 'apps/testcase/templates/testcases.modal.html',
                controller: 'TestcasesModalCtrl',
                controllerAs: 'vm',
                size: 'lg',
                resolve: {
                    nodes: function() {
                        return TestCaseService.getTestCases($scope.app.key);
                    },
                    tags: function() {
                        return TagService.getTags(vm.appId);
                    }
                }
            }).then(function(model) {
                return TestCaseService.setTagsForTestCases($scope.app.key, model).then(function() {
                    vm.reloadPage();
                });
            });
        }

        function filterTestCases(tagFilterType) {
            vm.tagFilterType = tagFilterType;
            vm.checkedFilterTags = _.map(_.filter(vm.testcasesTags, {checked: true}), "name")

            // vm.isFilterNoSetTag为true的时候,把vm.checkedFilterTags外面包一层,这样在filterData中通过参数类型是否为数组来判断过滤的条件
            vm.testcases.filterData(vm.currentScriptStatus, vm.currentDebugStatus, vm.currentFastModeStatus, vm.isFilterNoSetTag ? {checkedFilterTags: vm.checkedFilterTags} : vm.checkedFilterTags, vm.tagFilterType);

        }

        // 过滤未设置标签的用例
        function filterNoSetTagTestcase(event) {
            event.stopPropagation();
            vm.isFilterNoSetTag = !vm.isFilterNoSetTag;
        }

        function exportExecuteResult() {
            DataService.download("/api/testcase/" + vm.model.testCase.id + "/test_result/export/")
        }

        function reloadPage() {
            $state.go("app.testcases", {selectNodeId: ""}, {reload: true});
        }
    }

    function ImportExecutionController($scope, $uibModalInstance, $state, TaskService, TestCaseService, tasks, app) {

        $scope.tasks = tasks;

        $scope.nextStep = function() {
            var taskIds = _.chain(tasks).filter({ checked: true }).map("id").value().join(",");
            TaskService.getTaskExecutions(app.key, taskIds, true).then(function(data) {
                $scope.executions = data;
            });
            $scope.taskSelected = true;
        }

        $scope.cancel = function() {
            $uibModalInstance.dismiss();
        }

        $scope.submit = function() {
            var executionIds = _.chain($scope.executions).filter({ checked: true }).map("id").value();
            TestCaseService.importFromExecution(app.key, executionIds).then(function() {
                $uibModalInstance.close();
            })
        }

    }

    function RegexpsTemplateController($stateParams, RegexpsTemplateService, DialogService) {

        var vm = this

        _.extend(vm, {
            choose: choose,
            addRegexp: addRegexp,
            deleteRegexp: deleteRegexp,
            getSubString: getSubString
        })

        RegexpsTemplateService.getRegexps($stateParams.key).then(function(res) {
            vm.regexps = res
            vm.currentRegexp = vm.regexps[vm.regexps.length - 1] || null
        })

        function getSubString() {
            if (vm.regexp.reg_exp && vm.regexp.parent_string) {
                try {
                    var match = vm.regexp.parent_string.match(new RegExp(vm.regexp.reg_exp));
                    vm.regexp.sub_string = match ? match[1] : '';

                    // 添加模板后,需要把子串匹配出来显示为红色,有些正则写得有问题(例如:委托数量:\s+(\d+)+\s股),导致"regexpFormatText"指令不能正常显示,
                    // 所以这儿加一个"regexpFormatText"的匹配方式,两次匹配正常才允许添加
                    vm.regexp.reg_exp.match(/([^\/]+)?(\(.+\))([^\/]+)?/);
                    new RegExp('(' + RegExp.$1 + ')' + RegExp.$2 + '(' + RegExp.$3 + ')');
                } catch (e) {
                    vm.regexp.sub_string = '';
                }
            } else {
                vm.regexp.sub_string = '';
            }
        }

        function deleteRegexp(id) {
            DialogService.confirm({
                title: "提示",
                message: "确认删除此模板？",
                sureText: "删除",
                type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
            }).then(function () {
                RegexpsTemplateService.deleteRegexp(id).then(function () {
                    _.remove(vm.regexps, function (regexp) {
                        return regexp.id == id;
                    })
                    vm.currentRegexp = vm.regexps[vm.regexps.length - 1]
                })
            })
        }

        function choose(regexp) {
            vm.currentRegexp = regexp;
        }

        function addRegexp() {
            vm.regexp.sub_string && RegexpsTemplateService.addRegexp(vm.regexp).then(function(res) {
                vm.regexps.push(res)
                vm.currentRegexp = res
                vm.regexp = {}
            });
        }
    }

    function TagController($scope, $stateParams, DialogService, TagService) {
        var vm = this,
            appKey = $stateParams.key,
            tempTag;


        TagService.getTags(appKey).then(function(data){
            vm.tags = data;
            vm.validTags = _.cloneDeep(vm.tags); //初始化一个深拷贝的数组副本，用于判断添加或修改是否重复；
        });

        vm.addTag = addTag;
        vm.deleteTag = deleteTag;
        vm.chooseTag = chooseTag;
        vm.saveTag = saveTag;
        vm.cancel = cancel;

        function addTag() {
            if (_.find(vm.tags, {isEdit: true})) return;
            vm.isAdd = true;
            vm.tags.unshift({name: "", isEdit: true});
        }

        function saveTag(event, tag, enter) {
            var tags=vm.validTags; //获取深拷贝的数组样本；
             for(var i in tags){
                    if(tag.name === tags[i].name){
                        if(vm.isAdd) {
                            DialogService.alert('「' + tag.name + '」标签已经存在，不能重复添加！');
                            return;
                        }
                        else{
                            DialogService.alert('「' + tag.name + '」标签已经存在，不能重复修改！');
                            return;
                        }

                    }
                }
            event.stopPropagation();
            var keyCode = event.keyCode || event.which;
            if (!enter || (enter &&  keyCode == 13)) {
                delete tag.isEdit;
                if (_.isEmpty(tag.name)) {
                    return cancel(tag);
                }
                if (vm.isAdd) {
                    TagService.saveTag(appKey, tag).then(function() {
                        return TagService.getTags(appKey);
                    }).then(function(data) {
                        vm.tags = data;
                    })
                } else {
                    TagService.updateTag(appKey, tag);
                }
                vm.isAdd = false;
                vm.validTags = _.cloneDeep(vm.tags); //更新深拷贝数组副本;
            }
        }
        function deleteTag(event, tag) {
            event.stopPropagation();
            if (!tag.id) {
                _.remove(vm.tags, tag);
            } else {
                DialogService.confirm("确定删除此标签吗?").then(function() {
                    return TagService.deleteTag(appKey, {key: tag.key});
                }).then(function() {
                    _.remove(vm.tags, {id: tag.id})
                })
            }
        }

        function chooseTag(currentTag) {
            if (_.find(vm.tags, {isEdit: true})) return;

            tempTag = _.clone(currentTag);
            currentTag.isEdit = true;
        }

        function cancel(tag) {
            vm.isAdd && _.remove(vm.tags, tag);
            !vm.isAdd && (tag.name = tempTag.name);
            delete tag.isEdit;
        }
    }

    function TestcasesModalCtrl($rootScope, $scope, $uibModalInstance, DialogService, TESTCASE_ENUM, nodes, tags) {
        var vm = this;

        vm.nodes = nodes;
        vm.tags = tags;

        vm.stopPropagation = stopPropagation;
        vm.cancel = cancel;
        vm.close = close;

        _initTree();

        function _initTree() {
            
            //根节点默认展开
            vm.nodes[0].open = true;
            vm.nodes.hideExecutedTestcase = true;
            vm.nodes.hideRecordedTestcase = true;
            //场景节点都设置为父节点；没有脚本的用例不可选择
            angular.forEach(vm.nodes, function(node) {
                if (node.type == TESTCASE_ENUM.type.scenario) {
                    node.isParent = true;
                    node.nocheck = true;
                } else {
                    if (node.script_status == 0 && node.parent_id) {
                        node.chkDisabled = true;
                    }
                    node.isParent = false;
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
                    fontCss: _getFontCss,
                    addDiyDom: _addDiyDom
                },
                callback: {
                    onClick: function(event, treeId, treeNode) {
                        _getTreeObj().expandNode(treeNode);
                    }
                }
            };
        }

        function _addDiyDom(treeId, treeNode) {
            var $treeNode,
                iconParamHtml = "<span class='button icon-param' ></span>";

            if (treeNode.type == TESTCASE_ENUM.type.case) {
                $treeNode = $("#" + treeNode.tId + "_span");
                if (treeNode.expanding_dim) {
                    $treeNode.after(iconParamHtml);
                }
            }
        }

        function _getFontCss(treeId, treeNode) {
            return {
                "font-size": "14px",
                "color": (treeNode.executed || ($scope.isScriptRecord && treeNode.has_script)) ? 'gray' : '#333'
            };
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("testcases-modal-tree");
        }

        function stopPropagation(event) {
            event.stopPropagation();
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function close() {
            var testcase_ids = _.chain(_getTreeObj().getCheckedNodes(true)).filter({ isParent: false }).map('id').value();
            if (testcase_ids.length == 0) return DialogService.alert('请选择用例！');
            var tag_keys = _.map(_.filter(vm.tags, {checked: true}), "key");
            if (tag_keys.length == 0) return DialogService.alert('请选择标签！');
            $uibModalInstance.close({testcase_ids: testcase_ids, tag_keys: tag_keys});
        }
    }
})();

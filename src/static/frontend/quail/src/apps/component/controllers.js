(function () {
    angular.module("testcase.component")
        .controller("componentController", componentController)
        .controller("manageController", manageController);

    function componentController($scope, $state, $stateParams, $filter, DialogService, componentService, components, ModalService, COMPONENT_ENUM, TESTCASE_ENUM) {
        var vm = this;

        vm.components = components;
        vm.model = {};

        vm.setting = {
            initSelectNodeID: $stateParams.selectedComponentId
        };
        vm.getComponent = getComponent;
        vm.goSnapshot = goSnapshot;
        vm.exportExcel = exportExcel;
        vm.createComponent = createComponent;
        vm.validateComponentNameChange = validateComponentNameChange;
        vm.copyScript = copyScript;

        _init();

        function _init() {
            _.each(vm.components, function (t) {
                t.displayName = t.name;
            });

            $scope.$on('node.beforeDelete', function (e, node, callback) {
                e.stopPropagation();
                componentService.deleteComponent(node.id).then(function() {
                    _.remove(vm.components, {id: node.id});
                    callback()
                }).catch(function(data) {
                    if (data.length > 0) {
                        DialogService.alert("已有用例引用此模块,删除此模块需要先删除对此模块的引用!");
                    }
                });
            });

            $scope.$on('node.afterClick', function (e, node) {
                e.stopPropagation();
                return getComponent(node.id);
            });

            $scope.$on('tree.inited', function(e, api) {
                vm.caseTreeApi = api;
            });

            $scope.$on('node.drop', function (e, param) {
                e.stopPropagation();
                componentService.moveComponent(param);
            });

        }

        function getComponent(id) {
            componentService.getComponent(id).then(function (data) {
                vm.model.component = data;
                vm.isDirectory = vm.model.component.type == COMPONENT_ENUM.type.directory;
                vm.model.component.isRootNode = !_.isNumber(_.find(vm.components, {id: id}).parent_id);
                vm.actionIds = vm.model.component.actionIds = _.chain(vm.model.component.script_json.actions)
                    .filter(function(action) {
                        return action.actionId && _.includes(TESTCASE_ENUM.snapshotActions, action.action);
                    })
                    .map(function (action) {
                        return {actionId: action.actionId, resourceId: action.resourceId};
                    })
                    .uniq()
                    .value();
            });
        }

        function goSnapshot(id, snapshotKey) {
            vm.isDirectory || $state.go("app.component.detail.snapshot", {id: id, snapshotKey: snapshotKey});
        }

        function exportExcel(type) {
            window.open("/api/testcase/component/" + vm.model.component.id + "/" + type + "/xpath/");
        }

        function createComponent() {
            ModalService.show({
                templateUrl: "apps/component/templates/component.name.modal.html",
                size: "md",
                model: {
                    componentName: "",
                    validateComponentNameChange: vm.validateComponentNameChange
                }
            }).then(function(model) {
                $state.go("app.component.detail.snapshot", {
                    id: vm.model.component.id,
                    snapshotKey: vm.model.component.script_json.actions[0].actionId,
                    componentName: model.componentName
                });
            })
        }

        function validateComponentNameChange(model) {
            model.errorMsg = _.find(components, {name: model.componentName}) ? "模块名重复" : "";
        }

        function copyScript() {
            // 传name表示将当前模块克隆到目标模块中，不传则新建模块（后端实现）
            DialogService.input({
                    title: '请输入模块名',
                    regular: new RegExp,
                    data: $filter('date')(new Date(), 'yyyy-MM-dd') + "克隆自" + vm.model.component.name
                })
                .then(function(name) {
                    return componentService.copyScript(vm.model.component.id, name);
                })
                .then(function(data) {
                    $state.go("app.component", {selectedComponentId: data.id}, {reload: true});
                });
        }
    }

    function manageController($scope, $state, $stateParams, DialogService, TESTCASE_ENUM, TestCaseService, componentService, testcases, components, spinner, COMPONENT_ENUM) {

        !_.isBoolean($stateParams.isUpdate) && $state.go("^", $stateParams, {reload: true});

        var vm = this,
            startIndex,
            endIndex,
            appkey = $stateParams.key;

        vm.isDirectory = $stateParams.type == COMPONENT_ENUM.type.directory;
        vm.isUpdate = $stateParams.isUpdate;
        vm.testcases = testcases;
        vm.caseTreeApi = {};
        vm.setting = {
            noDeleteConfirm: false,
            edit: {
                enable: false
            }
        };
        vm.model = {
            testcase: {}
        };

        vm.model.component = {};
        if ($stateParams.component) {
            vm.setting.initSelectNodeID = $stateParams.component.origin_testcase_id;
            if (vm.isUpdate) {
                vm.model.component = $stateParams.component;
            } else {
                vm.setting.ignoreDeletedAlert = true;
                if ($stateParams.component.type == COMPONENT_ENUM.type.directory) {
                    vm.parent = $stateParams.component;
                }
            }

        }

        vm.getTestcase = getTestcase;
        vm.selectSnapshot = selectSnapshot;
        vm.cannotSave = cannotSave;
        vm.saveComponent = saveComponent;
        vm.cancel = cancel;
        vm.componentArr = [];
        vm.createNewComponent = createNewComponent;
        vm.removeComponent = removeComponent;

        _init();

        function _init() {
            _.each(vm.testcases, function(t) {
                t.displayName = t.code + ":&nbsp;&nbsp;" + t.name;
                t.title = t.code + " " + t.name;
            });

            $scope.$on('tree.inited', function(e, api) {
                vm.caseTreeApi = api;
            });

            $scope.$on('node.afterClick', function(e, node) {
                e.stopPropagation();
                return vm.getTestcase(node.id).then(function(testcase) {
                    if (vm.isUpdate && testcase.type == TESTCASE_ENUM.type.case) {
                        // 找到模块第一张截图在用例截图中的位置
                        var startIndex = _.findIndex(testcase.snapshots, function(snapshot) {
                            return snapshot.key == vm.model.component.actionIds[0].actionId;
                        }),
                            endIndex = startIndex + vm.model.component.actionIds.length - 1;

                        if (startIndex < 0) return;

                        // 然后根据length选择模块截图
                        for (var i = startIndex; i <= endIndex; i++) {
                            testcase.snapshots[i].isSelected = true;
                        }
                    }
                });
            });
        }

        //创建模块还未保存时离开提示
        var removeListener = $scope.$on('$stateChangeStart', function(event, toState, toParams){
           if(vm.componentArr.length) {
                spinner.hide();
                event.preventDefault();
                DialogService.confirm("您创建的还未保存，继续退出将丢失数据?").then(function() {
                    removeListener();
                    $state.go(toState, toParams);
                });
           }
        });

        window.onbeforeunload = function() {
            return "确认离开";
        };
        $scope.$on('$destroy', function() {
            window.onbeforeunload = null;
        });

        function getTestcase(id) {
            return TestCaseService.getTestCase(id).then(function (data) {

                vm.model.testcase = data;

                // 过滤点模块,模块不能作为模块的组成部分
                vm.model.testcase.snapshots = _.filter(vm.model.testcase.snapshots || [], function (snapshot) {
                    return !snapshot.componentName;
                });

                // 1.老数据没有script_json 2.没有截图时没有script_json
                if (vm.model.testcase.script_json) {
                    vm.model.testcase.script_json.actions = _.filter(vm.model.testcase.script_json.actions || [], function (json) {
                        return !json.componentName;
                    });
                }

                return vm.model.testcase;
            });
        }

        function selectSnapshot(index) {
            var snapshots = vm.model.testcase.snapshots;
            // 选择开始和结束的图片.如果已经选择好,再次点击则重新选择
            if (!_.isUndefined(endIndex) || vm.isDirectory) {
                startIndex = endIndex = undefined;
            }

            if (_.isUndefined(startIndex)) {
                startIndex = index;
                _.each(snapshots, function(snapshot) {
                    snapshot.isSelected = false;
                });

                snapshots[index].isSelected = true;
            } else {
                endIndex = _.max([startIndex, index]);
                startIndex = _.min([startIndex, index]);

                _.each(snapshots, function(snapshot, i) {
                    if (i >= startIndex && i <= endIndex) {
                        snapshot.isSelected = true;
                    }
                });
            }
        }

        function removeComponent(component) {
            vm.componentArr.splice(_.findIndex(vm.componentArr, component), 1);
        }

        function createNewComponent() {
            if (!_validate()) {
                return false;
            }

            vm.componentArr.push(vm.model.component);
            vm.model.component = {};
            _.forEach(_.filter(vm.model.testcase.snapshots, {isSelected: true}), function(snapshot) {
                snapshot.isSelected = false;
            });
            return true;
        }

        function cannotSave() {
            return !(vm.model.component.name || vm.componentArr.length);
        }

        function saveComponent() {
            var isValidated = true;
            if (!_.isEmpty(vm.model.component.name)) {
                isValidated = vm.createNewComponent();
            }
            if (!isValidated || vm.componentArr.length == 0) {
                return;
            }
            if (vm.isUpdate) {
                var id = vm.componentArr[0].id;
                componentService.updateComponent(vm.componentArr[0]).then(function () {
                    vm.componentArr = [];
                    $state.go("^", { selectedComponentId: id }, { reload: true });
                }, function() {
                    //创建失败数据还原
                    vm.model.component = vm.componentArr[0];
                    vm.componentArr = [];
                });
            } else {
                componentService.saveComponent(appkey, vm.componentArr).then(function (data) {
                    vm.componentArr = [];
                    $state.go("^", { selectedComponentId: data.id[0] }, { reload: true });
                }, function() {
                    //创建失败数据还原
                    if (vm.isDirectory) {
                        vm.model.component = vm.componentArr[0];
                        vm.componentArr = [];
                    }
                });
            }
        }

        function _validate() {
            if (_.isEmpty(vm.model.component.name)) {
                DialogService.alert("名称不能为空!");
                return false;
            } else if (!vm.isUpdate && _.find(components, {name: vm.model.component.name})) {
                DialogService.alert("名称不能重复!");
            } else if (vm.model.component.name.match('#')) {
                DialogService.alert("名称不能包含‘#’!");
            } else {
                var snapshots = _.filter(vm.model.testcase.snapshots, {isSelected: true});
                vm.model.component.type = vm.isDirectory ? COMPONENT_ENUM.type.directory : COMPONENT_ENUM.type.component;
                if (snapshots.length > 0) {
                        var start= _.findIndex(vm.model.testcase.script_json.actions, { actionId: snapshots[0].key }),
                        end = _.findLastIndex(vm.model.testcase.script_json.actions, { actionId: snapshots[snapshots.length - 1].key });
                    vm.model.component.script_json = {
                        actions: vm.model.testcase.script_json.actions.slice(start, end + 1)
                    };
                    vm.model.component.origin_testcase_id = vm.model.testcase.id;
                }
                if (vm.parent) {
                    vm.model.component.parent_id = vm.parent.id;
                }
                return snapshots.length > 0 ? validateCondition(start, end) : true;
            }
        }


        // 验证选择的脚本,如果包含条件语言,是否完整嵌套.
        function validateCondition(startIndex, endIndex) {
            // 目前支持的条件
            var conditions = [
                    {action: "if", position: "begin", relative: "endif"},
                    {action: "while", position: "begin", relative: "endwhile"},
                    {action: "repeat", position: "begin", relative: "endrepeat"},
                    {action: "beginSection", position: "begin", relative: "endSection"},
                    {action: "endif", position: "end", relative: "if"},
                    {action: "endwhile", position: "end", relative: "while"},
                    {action: "endrepeat", position: "end", relative: "repeat"},
                    {action: "endSection", position: "end", relative: "beginSection"},
                    {action: "else", relative: "if"},
                    {action: "elif", relative: "if"}
                ],
                cloneComponentActions = _.clone(vm.model.component.script_json.actions),
                leftActions = vm.model.testcase.script_json.actions.slice(0, startIndex),
                rightActions = vm.model.testcase.script_json.actions.slice(endIndex + 1),
                stack = [],
                temp,
                pop,
                isValidated = true,
                findPreIndex = 0,
                step;
            _.each(vm.model.component.script_json.actions, function(action) {
                temp = _.find(conditions, {action: action.action});
                if (!temp) return;

                if (temp.position == "begin") {
                    stack.push(temp)
                } else if (temp.position == "end") {
                    pop = stack.pop();
                    // 遇到end语法并且栈中不存在对应语法,则往前找条件语法,找到就把该步unshift到cloneComponentActions
                    if (!pop) {
                        step = leftActions[leftActions.length - 1 - findPreIndex];
                        if (step && temp.relative == step.action) {
                            cloneComponentActions.unshift(step);
                            ++findPreIndex;
                        } else {
                            return _error(temp);
                        }
                    } else if (pop.relative != action.action) {
                        return _error(temp);
                    }
                } else {
                    // 遇到else elif,看stack中是否有if,没有继续往前找if,找到push到stack,找不到报错
                    if (!_.find(stack, {action: temp.relative})) {
                        step = leftActions[leftActions.length - 1 - findPreIndex];
                        if (step && temp.relative == step.action) {
                            stack.push(_.find(conditions, {action: temp.relative}));
                            cloneComponentActions.unshift(step);
                            ++findPreIndex;
                        } else {
                            return _error(temp);
                        }
                    }
                }
            });
            // 遍历完截取的模块actions,如果stack不为空,则往下找对应的条件语句
            if (stack.length > 0) {
                _.each(_.clone(stack), function(temp, index) {
                    pop = stack.pop();
                    step = rightActions[index];
                    if (step && pop.relative == step.action) {
                        cloneComponentActions.push(step);
                    } else {
                        return _error(pop);
                    }
                })
            }
            if (isValidated) {
                vm.model.component.script_json.actions = cloneComponentActions;
            }

            return isValidated;

            function _error(condition) {
                DialogService.alert('选择的脚本中"' + condition.action + '"条件语句嵌套错误,请选择完整的脚本块作为模块!');
                return isValidated = false;
            }
        }

        function cancel() {
            $state.go("^", {selectedComponentId: $stateParams.component && $stateParams.component.id}, {reload: true});
        }
    }
})();
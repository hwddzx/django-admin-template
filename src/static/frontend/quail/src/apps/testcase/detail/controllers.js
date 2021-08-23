(function() {
    angular.module("quail.testcases")
        .controller("TestcaseDetailCtrl", TestcaseDetailController)
        .controller("TestcaseParametersCtrl", TestcaseParametersController)
        .controller("TestcaseSnapshotCtrl", TestcaseSnapshotController)
        .controller("PluginCtrl", PluginController)
        .controller("InsertComponentController", InsertComponentController)
        .controller("SpreadJsonBlockController", SpreadJsonBlockController)
        .controller("MeasureNameController", MeasureNameController)
        .controller("ScriptGrammarController", ScriptGrammarController)
        .controller("customParamController", customParamController)
        .controller("configSectionController", configSectionController)
        .controller("FormulaScriptController", FormulaScriptController);

    function TestcaseDetailController($rootScope, $state, $stateParams, DialogService, testcase, scriptJsonInstance, TESTCASE_VALIDATE_VALUE) {
        var vm = this;

        vm.testcase = testcase;
        vm.isTestcaseDetail = $stateParams.isTestcaseDetail;

        vm.close = close;

        function close(isSave) {

            if (!isSave) { // 点击取消不做验证
                TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = false;
            }
            if(isSave && vm.testcase.type == 1){
                if (!$rootScope.actions) {
                    DialogService.alert('请先完成步骤添加后再保存！');
                    return;
                }
            }

            DialogService.confirm({
                message: isSave ? "确定保存吗?" : "确定取消吗?",
                sureText: "确定"
            }).then(_close);

            function _close() {
                if ($state.$current.name == 'app.testcases.detail.params') {
                    _broadcastTestcaseChanged();
                }

                $rootScope.$broadcast("finishEditSnapshot", {
                    toState: vm.isTestcaseDetail ? "app.testcases" : "app.component",
                    isSave: isSave
                });

                TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = true;
                $rootScope.actions = undefined;
            }
        }

        function _broadcastTestcaseChanged() {
            var includeParameterSnapshot = _.find(vm.testcase.snapshots, function(item) {
                return _includeParameter(item);
            });
            //1,0 仅代表是否存在存在扩展纬度，而不代表实际的维度
            testcase.expanding_dim = includeParameterSnapshot ? 1 : 0;
            //发送事件，通知左侧树更新接点图标
            $rootScope.$broadcast("testCase.onNodeChanged", testcase);
        }

        function _includeParameter(snapshot) {
            return (snapshot.ocrAreas && snapshot.ocrAreas.length) || _.find(snapshot.plugins || [], function(plugin) {
                    return plugin.hasOwnProperty('setText');
                });
        }

    }

    function TestcaseParametersController($scope, $state, $stateParams, FileService, ModalService, DialogService, TestCaseService, UploadService, scriptJsonInstance, spinner, variables) {

        var vm = this;

        vm.testcase = $scope.vm.testcase;
        vm.scriptJsonInstance = scriptJsonInstance;
        vm.variables = variables;
        vm.globalVariables = [];
        vm.hideGlobalVariable = hideGlobalVariable;
        vm.getKey = _.keys;
        vm.importData = importData;
        vm.exportData = exportData;
        vm.dataSetInstance = scriptJsonInstance.initDataSetsInstance();
        vm.formulaInstance = scriptJsonInstance.initFormulaInstance();
        vm.addCustomParam = addCustomParam;
        vm.filterData = filterData;
        vm.chooseReplayParam = chooseReplayParam;
        vm.isSelectedReplayParam = isSelectedReplayParam;
        vm.customParams = vm.dataSetInstance.customParams;
        vm.variablesHeader = [["参数名", "参数类型", "参数来源", "显示名"]];

        activate();

        function activate() {
            vm.parametersLength = vm.dataSetInstance.data.length;
            vm.testcase.script_json.dataSet.appoint_cols = vm.testcase.script_json.dataSet.appoint_cols || [];

            _filterGlobalVariables();
            beforeLeaveState();
            scriptJsonInstance.setGlobalVariables(vm.globalVariables);

            function _filterGlobalVariables() {
                var variable;
                _.each(vm.dataSetInstance.data, function(param) {
                    variable = _.find(vm.variables, {name: scriptJsonInstance.getparamBaseName(param)});
                    variable && vm.globalVariables.push({name: variable.name, value: variable.value});
                });
            }

            $scope.$watch("vm.dataSetInstance.headers", function() {
                if (vm.testcase.script_json.dataSet.appoint_col > vm.dataSetInstance.headers.length - 1) {
                    vm.testcase.script_json.dataSet.appoint_col = 0;
                }
            }, true)
        }

        function exportData() {
            var rows = [];
            _.forEach(vm.dataSetInstance.exportDataSet(), function(value) {
                rows.push(value);
            });
            _.forEach(vm.formulaInstance.data, function(value) {
                rows.push([value.name, value.formula]);
            });
            //只有一行时候是head，大于一行才有数据才可以导出模板
            vm.variablesHeader = rows;
            if (rows.length == 1) {
                DialogService.alert('请先添加参数再下载模板');
            } else {
                FileService.exportExcel(vm.testcase.name, rows)
            }
        }

        function importData($files) {
            if ($files && $files[0]) {
                var ext = $files[0].name.split(".").pop();
                if (ext == "xls" || ext == "xlsx") {
                    FileService.readExcel($files[0]).then(function(rows) {
                        var errorMsg;
                        if (!rows) errorMsg = "execl不能为空";
                        if(rows){
                            if (_.uniqBy(rows, 0).length !== rows.length) errorMsg = "参数名或表达式名不能重复";

                            var head = _.find(rows, {0:"参数名", 1:"参数类型", 2:"参数来源", 3:"显示名"});
                            if(!head){
                                errorMsg = '该文件不是标准参数模板文件，请点击「下载模板」并上传正确的模板文件！'
                            }else if (_.uniq(head).length !== head.length)  {
                                errorMsg = "数据列名不能重复不能重复";
                            }
                        }
                        if (!errorMsg) {
                            vm.formulaInstance.clearData();
                            var param,
                                err = {};
                            _.forEach(rows, function(row, index) {
                                if (!row) {
                                    err = {isErr: true, index: index};
                                    return false;
                                }
                                if (row.length == 2) {
                                    vm.formulaInstance.addFormula(row[1], row[0]);
                                } else if (row[0] == "参数名" && row[1] == "参数类型") {
                                    vm.dataSetInstance.changeHeaders(row.splice(4));
                                } else if ((param = _.find(vm.dataSetInstance.data, {name: row[0]})) || _.find(vm.customParams, {name: row[0]})) {
                                    param.alias = row[3];
                                    param.values = row.splice(4);
                                } else if (row[1] == "自定义" && row[2] == "自定义") {
                                    vm.dataSetInstance.addCustomParam(row[0], row.splice(4), row[3]);
                                } else {
                                    err = {isErr: true, index: index};
                                    return false;
                                }
                            });
                            if (err.isErr) errorMsg = "execl第" + (err.index + 1) + "行格式错误!";
                        }
                        errorMsg && DialogService.alert(errorMsg);
                    }).catch(function() {
                        spinner.hide();
                        DialogService.alert('该文件不是标准参数模板文件，请点击「下载模板」并上传正确的模板文件！');
                    });
                } else {
                    DialogService.alert("请上传xls、xlsx后缀的execl文件!");
                }
            }
        }

        function hideGlobalVariable(param) {
            return scriptJsonInstance.hideGlobalVariable(param);
        }

        function _validateTable() {
            var msg = vm.formulaInstance.formulaValidatedMsg();
            if (vm.dataSetInstance.headers.length !== _.uniq(vm.dataSetInstance.headers).length) {
                msg = "参数列名重复";
            }
            msg && DialogService.alert(msg);
            return !msg;
        }

        function beforeLeaveState() {
            $scope.$on("$stateChangeStart", stateChangeStart);
            $scope.$on("finishEditSnapshot", save);

            function stateChangeStart(event, toState) {
                if (toState.name == "app.testcases.detail.snapshot") {
                    if (!_validateTable()) {
                        spinner.hide();
                        event.preventDefault();
                    }
                }
            }

            function save(event, args) {
                if (args.isSave) {
                    _validateTable() && scriptJsonInstance.save(vm.testcase).then(_leave);
                } else {
                    _leave();
                }

                function _leave() {
                    $state.go("app.testcases", {selectNodeId: vm.testcase.id}, {reload: true});
                }
            }
        }

        function addCustomParam() {
            ModalService.show({
                templateUrl: 'apps/testcase/detail/templates/custom-param.modal.html',
                controller: 'customParamController',
                controllerAs: "vm",
                resolve: {
                    scriptJsonInstance: scriptJsonInstance
                }
            }).then(function(name) {
                vm.dataSetInstance.addCustomParam(name)
            });
        }

        function filterData(item) {
            return _.isBoolean(item.isMatchAllRegexp);
        }

        function chooseReplayParam(index) {
            var cols = vm.testcase.script_json.dataSet.appoint_cols;

            if(cols.length==1 && cols[0]==index){
                return DialogService.alert("至少需要指定一列数据用于回放!");
            }
            _.includes(cols, index) ? cols.splice(_.indexOf(cols, index), 1) : cols.splice(_.sortedIndex(cols, index), 0, index);
        }

        function isSelectedReplayParam(index) {
            return _.includes(vm.testcase.script_json.dataSet.appoint_cols, index);
        }
    }

    function TestcaseSnapshotController($rootScope, $scope, $state, $stateParams, $timeout, $q, $anchorScroll, $location, componentService, DialogService, TestCaseService, pluginService, ModalService, FileService, spinner, testcase, scriptJsonInstance, ScriptJsonService, TESTCASE_ENUM, TESTCASE_VALIDATE_VALUE, config) {
        var vm = this;

        vm.scriptJsonInstance = scriptJsonInstance;
        vm.testcase = testcase;
        vm.steps = [];
        vm.actions = [];
        vm.simpleActions = [];
        vm.simpleActions = [];
        vm.script_json = vm.testcase.script_json;
        vm.app = $scope.app;

        // 需要把vm.script_header_json定义成数组,vm.script_header_json重新赋值的时候ng才会重新repeat它
        vm.script_header_json = [];
        vm.script_header_json[0] = _.cloneDeep(vm.testcase.script_json);
        delete vm.script_header_json[0].actions;

        vm.back = back;
        vm.filterEditedSnapshot = false;
        vm.currentPanel = 'json'; // xml or json
        vm.isShowXmlJsonPanel = true;
        vm.pluginParameters = {};
        vm.setTextParameter = "";
        vm.isTestcaseDetail = $stateParams.isTestcaseDetail; // true为用例详情,否则就是模块详情
        vm.isDirectory = !!vm.testcase.type; // 0为模块,1为目录
        vm.activeTab = vm.isDirectory ? 'addStep' : 'rule';
        vm.paramType = TESTCASE_ENUM.paramType.layout;
        vm.willBeDeleteActions = []; //批量删除脚本模态框中被勾选了，将要被删除的脚本

        // 图片
        vm.selectSnapshot = selectSnapshot;
        vm.getSnapshotByKey = getSnapshotByKey;
        vm.toggleStep = toggleStep;
        vm.toggleStepFilter = toggleStepFilter;
        vm.showSnapshots = showSnapshots;
        vm.isSnapshotEdited = TestCaseService.isSnapshotEdited;
        vm.showComponent = showComponent;
        vm.ignoreAction = ignoreAction;
        vm.toggleDeleteSnapshot = toggleDeleteSnapshot;
        vm.configSection = configSection;

        //布局和脚本
        vm.toggleDetailPanel = toggleDetailPanel;
        vm.toggleXmlJsonPanel = toggleXmlJsonPanel;
        vm.xmlClick = xmlClick;
        vm.downloadXml = FileService.downloadText;
        vm.checkedLayout = checkedLayout;
        vm.addJsonBlock = addJsonBlock;
        vm.deleteJsonBlock = deleteJsonBlock;
        vm.deleteJsonBlocks = deleteJsonBlocks;
        vm.isValidJsonBlock = isValidJsonBlock;
        vm.spreadJsonBlock = spreadJsonBlock;
        vm.insertComponent = insertComponent;
        vm.insertGrammar = insertGrammar;
        vm.cutJsonBlockFields = cutJsonBlockFields;
        vm.showAllJsonBlockFields = showAllJsonBlockFields;
        vm.isComponent = ScriptJsonService.isComponent;

        //参数配置
        vm.onInputNameChanged = onInputNameChanged;
        vm.onPluginParameterNameChanged = onPluginParameterNameChanged;
        vm.clearPluginParameter = clearPluginParameter;
        vm.clearInputParameter = clearInputParameter;
        vm.removeOcrArea = removeOcrArea;
        vm.deleteMeasure = deleteMeasure;

        //插件配置
        vm.getPlugin = getPlugin;
        vm.addPlugin = addPlugin;
        vm.deletePlugin = deletePlugin;
        vm.pluginFilter = pluginFilter;

        //锚点配置
        vm.toggleCheckAnchor = toggleCheckAnchor;
        vm.getSnapshotOriginUrl = getSnapshotOriginUrl;

        vm.getNameByIndex = getNameByIndex;

        activate();

        function cutJsonBlockFields(action) {
            var result = {},
                cloneAction = _.cloneDeep(action),
                oftenActionsField = _.cloneDeep(TESTCASE_ENUM.oftenActionsField);
            if (_.find(TESTCASE_ENUM.needCutActions, function(o) { return o == cloneAction.action; })) {
                _.forEach(oftenActionsField[cloneAction.action], function (field) {
                    if (cloneAction[field] !== undefined) {
                        result[field] = cloneAction[field];
                    }
                });
                if (_.isEmpty(result)) {
                    result = _.cloneDeep(action);
                }
            } else {
                result = _.cloneDeep(action);
            }
            return result;
        }

        function showAllJsonBlockFields(index) {
            vm.simpleActions[index] = _.cloneDeep(vm.actions[index]);
        }

        function activate() {
            _bindResizeEvent();
            beforeLeaveState();

            // 创建新模块,显示创建模块的名字
            if (vm.isDirectory) {
                vm.testcase.name = $stateParams.componentName;
            }

            if (vm.testcase.snapshots.length > 0) {
                config.fromState.name != "app.testcases.detail.params" && TestCaseService.reConfigScriptJson(vm.testcase.snapshots, vm.script_json, false);
                vm.actions = scriptJsonInstance.getActions();
                _.forEach(vm.actions, function(action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
                vm.steps = scriptJsonInstance.getSteps();
                vm.firstSnapshot = _.find(vm.testcase.snapshots, function(snapshot) {
                    return !snapshot.hasOwnProperty("componentName");
                });
                selectSnapshot($stateParams.snapshotKey ? $stateParams.snapshotKey : ($scope.$parent.currentSnapshotKey ? $scope.$parent.currentSnapshotKey : vm.steps[0].key), true);
            }

            function _bindResizeEvent() {
                $(window).on('resize', _notifySnapshotResize);
                $scope.$on("$destroy", function() {
                    $(window).off('resize', _notifySnapshotResize);
                });
            }

            $scope.$on('node.afterClick', function(e, node) {
                e.stopPropagation();
                vm.checkedXpath = _getXpathByNode(node);
                return vm.xmlClick(node);
            });

            function _getXpathByNode(node) {
                var arr = _.map(node.getPath(), function(node) {
                    return "node[" + ( parseInt(node._index) + 1) + "]";
                });
                return "/hierarchy/" + arr.join("/");
            }
        }

        /**
         * 1.因为要实现导入脚本能够100%还原用例,所以把所有对象放到script_json,前端根据script_json对象组合snapshots.
         * 2.使用_.cloneDeep()作用: angular在模板上对对象的监听,只能监听到外层的改变,每次修改都要表现在脚本块里,所以每次改变之后重新赋值,强制script_json改变而让模板重新渲染
         * */
        function selectSnapshot(key, scrollToSnapshot) {
            var snapshot = vm.getSnapshotByKey(key),
                /**
                 * 在$q.all中对getSnapshotLayouts和getXmlLayout方法注册成功和失败的回调,保障其中一个失败了,另一个也能在执行$q.all的when方法之前被执行赋值
                 * 比如:anchor找不到,xml文件存在,则前端可以通过xml自定义anchor
                 **/
                anchorPromise = TestCaseService.getSnapshotLayouts(snapshot.miniLayoutUrl).then(function(data) {
                    return vm.anchorLayouts = data;
                }, function() {
                    return vm.anchorLayouts = undefined;
                }),
                xmlPromise = TestCaseService.getXmlLayout(snapshot.layoutUrl).then(function(data) {
                    return vm.xml = data;
                }, function() {
                    return vm.xml = undefined;
                });

            spinner.wrap($q.all([anchorPromise, xmlPromise, TestCaseService.loadSnapshot(snapshot)]).finally(_setting));

            function _setting() {
                vm.snapshot = snapshot;
                if (!vm.isTestcaseDetail) {
                    vm.snapshot.createComponentType = TESTCASE_ENUM.createComponentType.click; // 默认click
                    vm.snapshot.dragType = TESTCASE_ENUM.dragType.scrollableXpath; // 默认scrollable xpath
                    vm.snapshot.dragDirection = TESTCASE_ENUM.dragDirection.up; // 默认向上滑动
                    vm.snapshot.dragOrientation = TESTCASE_ENUM.dragOrientation.horizontal; //默认向水平方向滑动

                    if (vm.isDirectory) {
                        vm.originActions = _.cloneDeep(vm.actions);
                        vm.actions = [];
                        $scope.$broadcast("snapshot:reload", scrollToSnapshot);
                        return
                    }
                }

                vm.pluginParameters = {};
                vm.setTextParameter = "";
                _.forEach(snapshot.plugins, function(plugin) {
                    plugin.phase && (vm.pluginParameters[plugin.phase] = plugin.name);
                    !plugin.phase && (vm.setTextParameter = plugin.name)
                });

                vm.snapshot.ocrAreas = vm.snapshot.ocrAreas || [];
                vm.snapshot.showGesture = true;

                var snapshotAction = vm.actions[_getSnapshotActionIndex()];
                vm.snapshot.clickMode = _.isUndefined(snapshotAction.clickMode) ? TESTCASE_ENUM.clickMode.controlPriority : snapshotAction.clickMode;
                // Django不返回rectCandidates,前端从anchor文件中组合
                vm.snapshot.rectCandidates = [];
                if (vm.anchorLayouts) {
                    if ((_.indexOf(TESTCASE_ENUM.clickActions, snapshotAction.action) > -1)) {
                        _.each(vm.anchorLayouts, function(obj, key) {
                            if (key.indexOf("/hierarchy") > -1) {
                                obj.area.xPath = key;
                                vm.snapshot.rectCandidates.push(obj.area);
                            }
                        });
                        vm.snapshot.validClickRect = _.find(vm.snapshot.rectCandidates, {xPath: snapshotAction.clickNode});
                    }
                    // anchor文件中的"imageObjects",代表新图像识别分割的小图坐标信息集合
                    if (!_.isEmpty(vm.anchorLayouts.imageObjects)) {
                        vm.snapshot.splitImageRects = vm.anchorLayouts.imageObjects;
                    }

                    // 根据acion中的anchorId选中基准点
                    if (snapshotAction.anchorId) {
                        vm.snapshot.anchor = _.find(vm.anchorLayouts[snapshotAction.clickNode].features, {id: snapshotAction.anchorId});
                    } else {
                        if (snapshotAction.clickNode && vm.anchorLayouts[snapshotAction.clickNode] && vm.anchorLayouts[snapshotAction.clickNode].xPathIndex && vm.anchorLayouts[snapshotAction.clickNode].xPathIndex.xPath == snapshotAction.xPath) {
                            vm.snapshot.anchor = 'location';
                        }
                    }
                }

                if (vm.isShowXmlJsonPanel && vm.currentPanel == "json") {
                    _anchorScroll(_getSnapshotActionIndex(undefined, true));
                }

                if (vm.snapshot.validClickRect) {
                    vm.snapshot.overlapControlPath = vm.snapshot.validClickRect.xPath;
                }

                $scope.$broadcast("snapshot:reload", scrollToSnapshot);
            }
        }

        function getSnapshotByKey(key) {
            return _.find(vm.testcase.snapshots, {key: key});
        }

        function showComponent() {
            var currentComponent, newWindow = window.open("");
            componentService.getComponents($stateParams.key).then(function(components) {
                currentComponent = _.find(components, function(component) {
                    return component.name == vm.getNameByIndex(vm.snapshot.componentName);
                });
                newWindow.location.href = $state.href("app.component", {selectedComponentId: currentComponent.id});
            })
        }

        function getNameByIndex(name, index, separator) {
            return name.split(separator || "#")[index || 0];
        }

        function insertComponent(index) {
            scriptJsonInstance.insertComponent($stateParams.key, index).then(function(actions) {
                vm.actions = actions;
                vm.simpleActions = [];
                _.forEach(vm.actions, function (action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
                vm.toggleStepFilter();
            });
        }

        function insertGrammar(index) {
            ModalService.show({
                templateUrl: 'apps/testcase/detail/templates/script.grammar.modal.html',
                windowClass: 'script-grammar-modal',
                backdrop: 'static',
                controller: 'ScriptGrammarController',
                controllerAs: 'vm',
                resolve: {
                    scriptJsonInstance: scriptJsonInstance
                }
            }).then(function(action) {
                vm.actions = scriptJsonInstance.addAction(action, index);
                vm.simpleActions = [];
                _.forEach(vm.actions, function (action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
                _anchorScroll(index);
            });
        }

        function ignoreAction(snapshot) {
            _.each(vm.actions, function(action, index) {
                if (snapshot.key == action.actionId) {
                    if (action.ignoreAction) {
                        delete vm.actions[index].ignoreAction;
                    } else {
                        _.extend(vm.actions[index], {
                            ignoreAction: true
                        });
                    }
                    vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
                    vm.simpleActions = [];
                    _.forEach(vm.actions, function (action) {
                        vm.simpleActions.push(vm.cutJsonBlockFields(action));
                    });
                }
            });
        }

        // 同步显示脚本headers dataSet
        $scope.$watch("vm.actions", function() {
            var data = {};

            if (vm.isDirectory) return;

            scriptJsonInstance.syncComponentParams().then(function() {

                _.forEach(scriptJsonInstance.getAllParams(), function(item) {
                    data[item.name] = item;
                });
                vm.script_header_json[0].dataSet.data = data;
                vm.script_header_json[0] = _.clone(vm.script_header_json[0]);
            })
        });

        // 修改点击规则时,相应修改脚本clickMode值
        $scope.$watch("vm.snapshot.clickMode", function(newV, oldV) {
            if (vm.isDirectory) return;
            if (vm.snapshot && !vm.snapshot.hasOwnProperty("componentName") && !_.isUndefined(newV)) {
                newV = Number(newV);
                oldV = Number(oldV);
                var index = _getSnapshotActionIndex();
                _.extend(vm.actions[index], {
                    clickMode: Number(vm.snapshot.clickMode)
                });
                var type = TESTCASE_ENUM.clickMode;
                if ((_.indexOf([type.imageNotForce, type.imageForce, type.imagePriority], oldV) > -1) && (_.indexOf([type.imageNotForce, type.imageForce, type.imagePriority], newV) == -1)) {
                    delete vm.actions[_getSnapshotActionIndex()].clickImage;
                }
                if ((_.indexOf([type.imageNotForce, type.imageForce, type.imagePriority], newV) > -1) && vm.snapshot.clickImage) {
                    _createClickImage();
                }
                vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
                vm.simpleActions = [];
                _.forEach(vm.actions, function (action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
            }
        });

        // 增加输出参数后相应在脚本增加一个参数action,位置:snapshot对应的action上面
        $scope.$on("addSnapshotParams", function(e, action) {
            vm.addJsonBlock(_getSnapshotActionIndex(), "pre", action);
        });

        // 增加输出参数后相应在脚本增加一个参数action,位置:snapshot对应的action上面
        $scope.$on("addStep", function(e, params) {
            var actionId = vm.isDirectory ? vm.originActions[0].actionId : vm.snapshot.key,
                actionTemp = scriptJsonInstance.getMainActionTemplate(vm.originActions, actionId),
                promise = $q.when();

            if (TESTCASE_ENUM.createComponentType.click == vm.snapshot.createComponentType) {
                vm.dragErrorMsg = "";
                _.extend(actionTemp, {
                    actionId: vm.snapshot.resourceId || vm.snapshot.key,// SS需要的actionId是增加步骤原图上的actionId(或者新增步骤上的resourceId)
                    action: "click",
                    params: params
                });
                promise = TestCaseService.getActionScript("click", actionTemp).then(function(action) {
                    return action;
                });
            } else {
                vm.dragErrorMsg = "";
                if (TESTCASE_ENUM.dragType.scrollableXpath == vm.snapshot.dragType) {
                    promise = TestCaseService.getActionScript("dragobject", params).then(function(data) {
                        if (_.isEmpty(data.xPath)) {
                            vm.dragErrorMsg = "未找到指定列表,请确认起点位置是否准确,或尝试(按坐标滑动)";
                            return DialogService.alert(vm.dragErrorMsg);
                        } else {
                            return _.extend(params, data);
                        }
                    })
                } else if (TESTCASE_ENUM.dragType.scrollIntoView == vm.snapshot.dragType) {
                    promise = TestCaseService.getActionScript("scrollintoview", params).then(function(data) {
                        if (_.isEmpty(data.xPath) || !_.isEmpty(data.xPath) && data.xPath.indexOf("@text") == -1) {
                            vm.dragErrorMsg = "xPath未包含'text'属性,请确认框选区域是否准确,或尝试(按坐标滑动)";
                            return DialogService.alert(vm.dragErrorMsg);
                        } else {
                            return DialogService.input("请输入要替换的文字").then(function(text) {
                                data.xPath = data.xPath.replace(/@text='.*?'/g, "@text='" + text + "'");
                                if(data.xPathWithoutResId){
                                    data.xPathWithoutResId = data.xPathWithoutResId.replace(/@text='.*?'/g, "@text='" + text + "'");
                                }
                                return _.extend(params, data);
                            });
                        }
                    })
                } else if (TESTCASE_ENUM.dragType.scrollByCoordinate == vm.snapshot.dragType) {
                    promise = $q.when().then(function() {
                        return params;
                    })
                }
            }
            promise.then(function(action){
                if (vm.dragErrorMsg) return;
                //新增步骤放在当前step后面
                vm.actions = vm.isDirectory ? scriptJsonInstance.setActions([action]) : scriptJsonInstance.addAction(action, _.findLastIndex(vm.actions, {actionId: actionId}) + 1);
                vm.simpleActions = [];
                _.forEach(vm.actions, function (action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
                $rootScope.actions = vm.actions;
            })
        });

        $scope.$on("measure", function(e, data) {
            ModalService.show({
                templateUrl: "components/image-area/measure.name.html",
                controllerAs: "vm",
                controller: "MeasureNameController",
                backdrop: "static",
                size: "md",
                resolve: {
                    actions: function() {
                        return vm.actions;
                    }
                }
            }).then(function(measureName) {
                var index = _.findIndex(vm.actions, {actionId: vm.snapshot.key}),
                    sliceActions = vm.actions.slice(0, index),
                    startIndex = _.findLastIndex(sliceActions, function(action) {
                        return _.indexOf(TESTCASE_ENUM.snapshotActions, action.action) > -1;
                    });

                if (startIndex > -1) {
                    // 当前截图的上一张截图对应的action设置"measureResponse":true
                    var startAction = vm.actions[startIndex],
                        currentAction = vm.actions[index];

                    startAction.measureResponse = true;
                    scriptJsonInstance.modifyAction(startAction, startIndex);
                    // 当前截图对应的action增加"measureName"和"measureImage"字段
                    _.extend(vm.snapshot, data);
                    _.extend(currentAction, {measureName: measureName, measureImage: "base64-code..."});
                    vm.actions = scriptJsonInstance.modifyAction(currentAction, index);
                    vm.simpleActions = [];
                    _.forEach(vm.actions, function (action) {
                        vm.simpleActions.push(vm.cutJsonBlockFields(action));
                    });
                }
            }).then(null, function() {
                $scope.$broadcast("measure:area:remove", true);
            })
        });

        $scope.$on("createClickImage", _createClickImage);

        function _createClickImage(e, data) {
            var index = _getSnapshotActionIndex();
            _.extend(vm.snapshot, data);
            _.extend(vm.actions[index], {
                clickImage: "base64-code..."
            });
            vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });
        }

        // 切换可选控件
        function checkedLayout(xPath) {
            $scope.$broadcast("checkedLayout", xPath);
            vm.snapshot.validClickRect = _.find(vm.snapshot.rectCandidates, {xPath: xPath});
            vm.snapshot.overlapControlPath = vm.snapshot.validClickRect.xPath;

            var feature = vm.anchorLayouts[xPath].features[0],
                area = vm.anchorLayouts[xPath].area,
                obj = {
                    clickNode: xPath
                },
                index = _getSnapshotActionIndex(),
                params = vm.actions[index].params;

            _.find(params, {key: "relativeX"}).value = area.relativeX;
            _.find(params, {key: "relativeY"}).value = area.relativeY;

            // 切换可选控件时有基准点默认选中第一个基准点
            if (feature) {
                vm.snapshot.anchor = feature;
                obj.anchorId = feature.id;

                _.extend(obj, {
                    xPath: feature.xPath,
                    xPathWithoutResId: feature.xPathWithoutResId,
                    scrollableXPath: feature.scrollableXPath,
                    scrollableXPathWithoutResId: feature.scrollableXPathWithoutResId,
                    params: params
                });
            } else {
                vm.snapshot.anchor = null;
                delete vm.actions[index].anchorId;

                _.extend(obj, {
                    xPath: vm.anchorLayouts[xPath].withoutFeature.xPath,
                    xPathWithoutResId: vm.anchorLayouts[xPath].withoutFeature.xPathWithoutResId,
                    params: params
                });
            }
            _.extend(vm.actions[index], obj);
            vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
            //vm.simpleActions = cutJsonBlockFields(vm.actions);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });

            // 切换可选控件时,不知道为什么滚动条会滚动到最后,所以强制滚动到当前截图脚本位置
            _anchorScroll(index);
        }

        /*
         * ignoreAlert: true表示只获取异常脚本index,否则验证提示脚本是否通过
         * */
        function isValidJsonBlock(ignoreAlert) {
            var pre = $(".json-block-wrap pre"),
                headerJson = {},
                json = "",
                number,
                isValid = true,
                catchIndex,
                errorMessage;
            pre.each(function(index) {
                try {
                    number = vm.isTestcaseDetail ? index + 1 : index;// 模块headerJson隐藏了,所以在界面上比用例脚本块少一个
                    json = JSON.parse($(this).text() || "{}");

                    if (_.isEmpty(json) || json.hasOwnProperty("")) {
                        if (index == 0 && vm.isTestcaseDetail && _.isEmpty(vm.testcase.snapshots) || (index == 0 && !vm.isTestcaseDetail)) return;

                        catchIndex = index;
                        _.isEmpty(json) && (errorMessage = "第" + number + "个脚本块不能为空!");
                        json.hasOwnProperty("") && (errorMessage = "第" + number + "个脚本块不能有空属性!");
                        return isValid = false;
                    }
                    // 用例第一个脚本块是脚本header
                    if (index == 0) {
                        if (vm.isTestcaseDetail) {
                            headerJson = json;
                        }
                    }
                } catch (e) {
                    catchIndex = index;
                    errorMessage = "第" + number + "个脚本块格式错误!";
                    return isValid = false;
                }
            });
            if (ignoreAlert) {
                return catchIndex;
            }

            if (isValid) {
                // 不使用界面上显示的dataSet(用户有可能改动)
                headerJson.dataSet = vm.script_json.dataSet;
                _.each(vm.script_json, function(value, key) {
                    delete vm.script_json[key];
                });
                _.extend(vm.script_json, headerJson);
                vm.script_json.actions = vm.actions;
            } else {
                DialogService.alert(errorMessage).finally(function() {
                    pre.eq(catchIndex).focus();
                });
            }
            return isValid;
        }

        function addJsonBlock(index, direction, action) {
            var defaultAction = {"": ""};
            action = action || defaultAction;

            /**
             * 前端插入脚本分两种:
             * 1.插件,前置插件插入到当前截图action最前面,后置插件插入到当前截图后面.
             * 2.输出参数,输出参数插入到当前截图的前面,如果有前置插件,输出参数会在前置插件后面.
             * */
            if (direction == "pre") {
                if (action.action == "initVariable" || action.action == "updateVariable") {// 插入参数,插入到当前截图action位置
                    index = _getSnapshotActionIndex(vm.actions[index]);
                }
            } else {
                if (action.action == "plugin-dev" || action.action == "plugin-tc") {// 插入后置插件块
                    index = _getSnapshotActionIndex(vm.actions[index]);
                }
                ++index;
            }
            index > -1 && (vm.actions = scriptJsonInstance.addAction(action, index));
            action == defaultAction && vm.spreadJsonBlock(index, {"": ""});
            vm.simpleActions.splice(index, 0, vm.cutJsonBlockFields(action));
            _anchorScroll(index);
        }

        function deleteJsonBlock(index, ignoreConform) {
            var action = vm.actions[index],
                snapshot = _.find(vm.testcase.snapshots, {key: action.actionId});
            if (ignoreConform) {
                _remove(action, snapshot, index);
            } else {
                TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = false;
                // catchIndex存在表示脚本有错误,不存在表示没有错误;
                // 如果脚本有错误存在,删除脚本块的index和有错误的catchIndex比较.删除自己不提示错误,删除其它脚本块则提示错误脚本位置,必须修复错误脚本才能继续删除,否则JSON格式错误后前端无法展示脚本了
                var catchIndex = vm.isValidJsonBlock(true);
                if (_.isUndefined(catchIndex) || catchIndex - 1 == index) {
                    var msg = ScriptJsonService.isMainControlAction(action) && !ScriptJsonService.isComponent(action) ? "删除步骤将删除本用例所有与之相同actionId的脚本，确定删除该脚本块吗?" : "确定删除该脚本块吗?";
                    DialogService.confirm(msg).then(function() {
                        _remove(action, snapshot, index)
                    }).finally(function() {
                        TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = true;
                    });
                } else {
                    DialogService.alert("第" + (vm.isTestcaseDetail ? catchIndex + 1 : catchIndex) + "个脚本块格式错误!").finally(function() {
                        TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = true;
                    });
                }
            }

        }

        function toggleDeleteSnapshot(snapshot) {
            _.each(vm.actions, function(action, index) {
                if (snapshot.key == action.actionId || (snapshot.componentName && snapshot.componentName == action.componentName)) {
                    if (action.deleteAction) {
                        delete vm.actions[index].deleteAction;
                    } else {
                        _.extend(vm.actions[index], {
                            deleteAction: true
                        });
                    }
                }
            });
        }

        function deleteJsonBlocks() {
            vm.willBeDeleteActions = [];
            _.each(vm.testcase.snapshots, function(snapshot) {
                _.each(vm.actions, function(action, index) {
                    if (snapshot.key == action.actionId || (snapshot.componentName && snapshot.componentName == action.componentName)) {
                        if (action.deleteAction) {
                            vm.willBeDeleteActions.push({
                                action: action,
                                snapshot: snapshot,
                                index: index - vm.willBeDeleteActions.length
                            });
                        }
                    }
                });
            });
            DialogService.confirm("确认删除吗？").then(function() {
                _.each(vm.willBeDeleteActions, function(item) {
                    _remove(item.action, item.snapshot, item.index);
                });
            });
        }

        function _remove(action, snapshot, index) {
            if (snapshot) {
                if (action.action == "initVariable" || action.action == "updateVariable") {
                    $scope.$broadcast("snapshot:area:remove", _.find(snapshot.ocrAreas, _callback));
                    _.remove(snapshot.ocrAreas, _callback);

                    function _callback(ocrArea) {
                        return ocrArea.name == action.variableName && action.action == ocrArea.action && action.index == ocrArea.index;
                    }
                } else if (action.action == "plugin-dev" || action.action == "plugin-tc") {
                    // "B":前置插件,"A":后置插件index在当前截图前面就是前置插件,否则就是后置插件
                    _.remove(snapshot.plugins, {phase: action.phase});
                }
            }

            if (index < 0) return;

            var stepIndex = _.findIndex(vm.steps, {key: vm.snapshot.key});// 把当前选中的stepIndex保留下来,切换step需要使用
            vm.actions = scriptJsonInstance.removeAction(index);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });
            ScriptJsonService.isMainControlAction(action) && vm.toggleStep(null, stepIndex);
        }

        function toggleStep(direction, index) {
            var curIndex = _.findIndex(vm.steps, {key: vm.snapshot.key});
            curIndex = curIndex > -1 ? curIndex : index;// 传index,使得删除当前step后,可以选中下一个step
            var maxIndex = vm.steps.length - 1,
                step = _.isUndefined(index) ? (direction == "pre" ? 1 : -1) : 0, // "pre"上一张,""或"next"下一张
                nextIndex = curIndex + step;

            nextIndex = nextIndex > maxIndex ? 0 : nextIndex;
            nextIndex = nextIndex < 0 ? maxIndex : nextIndex;

            if (curIndex != -1 && nextIndex <= maxIndex && nextIndex >= 0) {
                vm.selectSnapshot(vm.steps[nextIndex].key, true);
            }
        }

        function toggleStepFilter() {
            vm.steps = vm.filterEditedSnapshot ? scriptJsonInstance.getHasParamsSteps() : scriptJsonInstance.getSteps();
            if (!_.isEmpty(vm.steps) && !_.find(vm.testcase.snapshots, {actionId: vm.steps.key})) {
                vm.selectSnapshot(vm.steps[0].key, true);
            }
        }

        function showSnapshots(handleType) { // handleType -> ignore表示进行批量忽略操作，deleteJson表示批量删除脚本操作，否则就是截图查看
            ModalService.show({
                templateUrl: 'apps/testcase/detail/templates/testcase.snapshots.html',
                windowClass: 'dialog-snapshots',
                model: {
                    snapshots: vm.testcase.snapshots,
                    isSnapshotEdited: function(snapshot) {
                        return TestCaseService.isSnapshotEdited(snapshot);
                    },
                    getIndex: function(index) {
                        this.index = index;
                    },
                    ignoreAction: function(snapshot) {
                        return vm.ignoreAction(snapshot);
                    },
                    toggleDeleteSnapshot: function(snapshot) {
                        return vm.toggleDeleteSnapshot(snapshot);
                    },
                    deleteJsonBlocks: function() {
                        return vm.deleteJsonBlocks();
                    },
                    handleType: handleType
                }
            }).then(function(model) {
                if(model.handleType!='deleteJson') {
                    vm.selectSnapshot(vm.testcase.snapshots[model.index].key, true);
                }
            });
        }

        function configSection() {
            ModalService.show({
                templateUrl: "apps/testcase/detail/templates/config.section.html",
                windowClass: "config-section-modal",
                backdrop: "static",
                controller: "configSectionController",
                controllerAs: "vm",
                resolve: {
                    snapshots: function() {
                        return vm.testcase.snapshots;
                    },
                    actions: function() {
                        return vm.actions
                    },
                    nodes: function() {
                        return TestCaseService.getTestCases($stateParams.key);
                    }
                }
            }).then(function(actions) {
                vm.actions = scriptJsonInstance.setActions(actions);
            })
        }

        function spreadJsonBlock(index) {
            ModalService.show({
                templateUrl: 'apps/testcase/detail/templates/json.block.modal.html',
                windowClass: 'dialog-json-block',
                backdrop: 'static',
                controller: 'SpreadJsonBlockController',
                controllerAs: 'vm',
                resolve: {
                    model: function() {
                        return {
                            action: JSON.stringify(_.isUndefined(index) ? vm.script_header_json[0] : scriptJsonInstance.getActions()[index], null, 4)
                        }
                    }
                }
            }).then(function(model) {
                if (_.isUndefined(index)) {// 脚本header index传的undefined
                    var data  = []
                    vm.script_header_json[0] = model.action;
                    _.forEach(model.action.dataSet.data,function (item) {
                        data.push(item)
                    })
                    scriptJsonInstance.updateTestcaseParams(data)
                } else {
                    var actions = vm.actions;
                    vm.actions = scriptJsonInstance.modifyAction(model.action, index);
                    if(actions[index].expect != vm.actions[index].expect){
                         _.forEach(vm.testcase.script_json.dataSet.data,function (item) {
                            if(item.alias == model.action.variableName){
                                item.values[0] = model.action.expect
                            }
                        })
                    }
                    vm.simpleActions = [];
                    _.forEach(vm.actions, function (action) {
                        vm.simpleActions.push(vm.cutJsonBlockFields(action));
                    });
                    _anchorScroll(index);
                }
            });
        }

        function getSnapshotOriginUrl() {
            return vm.snapshot ? TestCaseService.getSnapshotOriginUrl(vm.snapshot) : "";
        }

        function toggleCheckAnchor(anchor, $event) {
            var snapshotAction = vm.actions[_getSnapshotActionIndex()],
                feature,
                obj;

            if ($event) {
                //如果radio已选中，再点击则取消选中
                if ($($event.target).hasClass('checked')) {
                    delete vm.snapshot.anchor;
                    _cancelAnchor();
                } else {
                    vm.snapshot.anchor = anchor;
                    if (anchor == 'location') {
                        _selectLocation();
                    } else {
                        _selectAnchor();
                    }
                }
            } else {
                _changeSnapshotAnchor();
            }
            var index = _getSnapshotActionIndex();
            _.extend(vm.actions[index], obj);
            vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });

            function _changeSnapshotAnchor() {
                var condition = vm.snapshot.anchor && (vm.snapshot.anchor.id == anchor.id);
                if (condition) {
                    delete vm.snapshot.anchor;
                    _cancelAnchor();
                } else {
                    vm.snapshot.anchor = anchor;
                    _selectAnchor();
                }
            }

            function _cancelAnchor() {
                var action = vm.actions[_getSnapshotActionIndex()];

                // 取消基准点,从anchor文件获取withoutFeature对象赋值给脚本
                feature = vm.anchorLayouts[snapshotAction.clickNode].withoutFeature;
                obj = {
                    clickNode: snapshotAction.clickNode
                };

                delete action.anchorId;
                action.scrollableXPath && delete action.scrollableXPath;
                action.scrollableXPathWithoutResId && delete action.scrollableXPathWithoutResId;

                if (feature) {
                    _.extend(obj, {
                        xPath: feature.xPath,
                        xPathWithoutResId: feature.xPathWithoutResId
                    });
                }
            }

            function _selectAnchor() {
                feature = _.find(vm.anchorLayouts[snapshotAction.clickNode].features, {id: vm.snapshot.anchor.id});
                obj = {
                    anchorId: vm.snapshot.anchor.id,
                    clickNode: snapshotAction.clickNode
                };
                if (feature) {
                    _.extend(obj, {
                        xPath: feature.xPath,
                        xPathWithoutResId: feature.xPathWithoutResId,
                        scrollableXPath: feature.scrollableXPath,
                        scrollableXPathWithoutResId: feature.scrollableXPathWithoutResId
                    });
                }
            }
            //位置点击
            function _selectLocation() {
                var action = vm.actions[_getSnapshotActionIndex()];
                feature = vm.anchorLayouts[snapshotAction.clickNode].xPathIndex;
                obj = {
                    clickNode: snapshotAction.clickNode
                };
                delete action.anchorId;
                action.scrollableXPath && delete action.scrollableXPath;
                action.scrollableXPathWithoutResId && delete action.scrollableXPathWithoutResId;
                if (feature) {
                    _.extend(obj, {
                        xPath: feature.xPath,
                        xPathWithoutResId: feature.xPathWithoutResId
                    });
                }
            }
        }

        function getPlugin(phase) {
            return _.find(vm.snapshot ? vm.snapshot.plugins : [], {phase: phase});
        }

        function addPlugin(phase) {
            var snapshot = vm.snapshot;
            ModalService.show({
                templateUrl: 'apps/testcase/detail/templates/plugin.modal.html',
                controller: 'PluginCtrl',
                resolve: {
                    plugins: function() {
                        return pluginService.getPlugins($stateParams.key);
                    }
                }
            }).then(function(plugin) {
                snapshot.plugins = snapshot.plugins || [];
                snapshot.plugins.push({
                    pluginName: plugin.name,
                    path: plugin.path,
                    phase: phase,
                    originTextValue: plugin.originTextValue,
                    params: plugin.params
                });

                var index = _.findIndex(vm.actions, {actionId: _getSnapshotKey()}),
                    currentAction = vm.actions[index],
                    action = {
                        "actionId": currentAction.actionId,
                        "action": plugin.executionWay,
                        "name": plugin.name,
                        "phase": phase,
                        "params": [
                            {"key": "param", "value": plugin.path.split("/").pop() + " " + plugin.originTextValue}
                        ]
                    };

                vm.addJsonBlock(index, phase == "A" ? "next" : "pre", action)
            });
        }

        function deletePlugin(phase, ignoreConform) {
            var snapshot = vm.snapshot;
            if (ignoreConform) {
                _remove();
            } else {
                DialogService.confirm("确认删除插件？").then(_remove);
            }

            function _remove() {
                var plugin = _.find(snapshot.plugins, {phase: phase})
                if (plugin) {
                    _.remove(snapshot.plugins, {phase: phase});
                    var index = phase == "B" ?
                        _.findIndex(vm.actions, function(action) {
                            return (action.actionId == _getSnapshotKey()) && (action.action == "plugin-dev" || action.action == "plugin-tc");
                        }) :
                        _.findLastIndex(vm.actions, function(action) {
                            return (action.actionId == _getSnapshotKey()) && (action.action == "plugin-dev" || action.action == "plugin-tc");
                        });

                    index > -1 && (vm.actions = scriptJsonInstance.removeAction(index));
                }
            }
        }

        function pluginFilter(plugin) {
            return plugin.hasOwnProperty('phase');
        }

        function clearPluginParameter(plugin) {
            TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = false;
            delete vm.pluginParameters[plugin.phase];
            delete plugin.name;
            delete plugin.setText;
            TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = true;

            _pluginParameterName(plugin);
        }

        function clearInputParameter() {
            TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = false;
            vm.snapshot.name = "";
            _.remove(vm.snapshot.plugins, function(item) {
                return item.setText && !item.phase;
            });
            TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = true;

            _inputNameChange();
        }

        function onPluginParameterNameChanged(plugin, event) {
            var parameterName = vm.pluginParameters[plugin.phase];
            if (plugin.name == parameterName) {
                return
            }
            if (parameterName) {
                if (!TESTCASE_ENUM.regular.param.test(parameterName)) {
                    return TestCaseService.alert(event.target, "参数名必须以字母开头,可以由字母、数字和不连续下划线组成!");
                } else if (scriptJsonInstance.hasSameParam(parameterName)) {
                    //如果插件参数名重复，则删除对应插件的setText字段
                    delete plugin.setText;
                    return TestCaseService.alert(event.target, "参数名重复!");
                } else {
                    if (!plugin.name) {
                        plugin.setText = [plugin.originTextValue];
                    }
                    plugin.name = parameterName
                }
            } else {
                //如果插件参数名为空，则删除对应插件的setText字段
                delete plugin.setText;
                delete plugin.name;
            }
            _pluginParameterName(plugin);
        }

        function _pluginParameterName(plugin) {
            var index = plugin.phase == "B" ? _.findIndex(vm.actions, function(action) {
                return (_getSnapshotKey() == action.actionId) && (action.action == "plugin-dev" || action.action == "plugin-tc");
            }) : _.findLastIndex(vm.actions, function(action) {
                return (_getSnapshotKey() == action.actionId) && (action.action == "plugin-dev" || action.action == "plugin-tc");
            });

            if (index > -1) {
                if (plugin.name) {
                    vm.actions[index].params[0].name = plugin.name;
                } else {
                    delete vm.actions[index].params[0].name;
                }
                vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
                vm.simpleActions = [];
                _.forEach(vm.actions, function(action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
            }
        }

        function _inputNameChange() {
            var index = _getSnapshotActionIndex(),
                name = vm.snapshot.name,
                obj = _.find(vm.actions[index].params, {key: "setText"});

            if (name) {
                obj.name = name;
            } else {
                delete obj.name;
            }
            _.extend(vm.actions[index], {params: [obj]});
            vm.actions = scriptJsonInstance.modifyAction(vm.actions[index], index);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });
        }

        function onInputNameChanged(event) {
            var snapshot = vm.snapshot;

            if (snapshot.name) {
                var inputPlugin = _.find(snapshot.plugins, function(plugin) {
                    return plugin.hasOwnProperty('setText') && !plugin.hasOwnProperty('phase');
                });


                if (inputPlugin && (inputPlugin.name == snapshot.name)) {
                    return;
                }
                if (!TESTCASE_ENUM.regular.param.test(snapshot.name)) {
                    return TestCaseService.alert(event.target, "参数名必须以字母开头,可以由字母、数字和不连续下划线组成!");
                } else if (scriptJsonInstance.hasSameParam(snapshot.name)) {
                    return TestCaseService.alert(event.target, "参数名重复!");
                }

                if (!inputPlugin) {
                    snapshot.plugins = snapshot.plugins || [];
                    snapshot.plugins.push({
                        name: snapshot.name,
                        setText: [snapshot.originTextValue]
                    });
                } else {
                    inputPlugin.name = snapshot.name;
                }
            } else {
                //如果输入名字为空，则删除对应的输入框
                _.remove(snapshot.plugins, function(plugin) {
                    return plugin.hasOwnProperty('setText') && !plugin.hasOwnProperty('phase');
                });
            }

            _inputNameChange();
        }

        function removeOcrArea(area) {
            _.remove(vm.snapshot.ocrAreas, area);
            var index = _.findIndex(vm.actions, function(action) {
                return action.actionId == _getSnapshotKey() && action.variableName == area.name && action.action == area.action && action.index == area.index;
            });
            vm.actions = scriptJsonInstance.removeAction(index);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });
            //发送事件通知删除对应的area图形
            $scope.$broadcast("snapshot:area:remove", area);
        }

        function deleteMeasure() {
            var index = _.findIndex(vm.actions, {actionId: vm.snapshot.key}),
                sliceActions = vm.actions.slice(0, index),
                startIndex = _.findLastIndex(sliceActions, function(action) {
                    return _.indexOf(TESTCASE_ENUM.snapshotActions, action.action) > -1;
                });

            if (startIndex > -1) {
                // 当前截图的上一张截图对应的action设置"measureResponse":false
                var startAction = vm.actions[startIndex];
                startAction.measureResponse = false;
                scriptJsonInstance.modifyAction(startAction, startIndex);
                vm.simpleActions = [];
                _.forEach(vm.actions, function (action) {
                    vm.simpleActions.push(vm.cutJsonBlockFields(action));
                });
            }

            var currentAction = vm.actions[index];
            // 当前截图对应的action删除"measureName"和"measureImage"字段
            delete currentAction.measureName;
            delete currentAction.measureImage;
            vm.actions = scriptJsonInstance.modifyAction(currentAction, index);
            vm.simpleActions = [];
            _.forEach(vm.actions, function (action) {
                vm.simpleActions.push(vm.cutJsonBlockFields(action));
            });
            $scope.$broadcast("measure:area:remove");
        }

        function back() {
            $state.go("^.snapshots");
        }

        function toggleDetailPanel() {
            vm.isShowXmlJsonPanel = !vm.isShowXmlJsonPanel;
            $rootScope.$broadcast("snapshot:resize");
        }

        function toggleXmlJsonPanel(currentPanel, $event) {
            vm.currentPanel = currentPanel;
            if (vm.currentPanel == "json") {
                _anchorScroll(_getSnapshotActionIndex());
            }
            $event.preventDefault();
        }

        function xmlClick(node) {
            vm.layoutProps = [];
            _.each(node, function(value, key) {
                if (_.startsWith(key, "_")) {
                    var obj = Object();
                    obj[key.substring(1)] = value;
                    vm.layoutProps.push(obj);
                }
            });
            vm.layoutProps.sort(function(obj1, obj2) {
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

        function beforeLeaveState() {
            $scope.$on("$stateChangeStart", stateChangeStart);
            $scope.$on("finishEditSnapshot", save);

            function stateChangeStart(event, toState) {
                // 跳转到参数之前记录snapshotKey,再跳转回配置时,直接选中该截图
                $scope.$parent.currentSnapshotKey = _getSnapshotKey();
                if (toState.name == "app.testcases.detail.params") {
                    if (!vm.isValidJsonBlock()) {
                        spinner.hide();
                        event.preventDefault();
                    }
                }
            }

            function save(event, args) {
                if (args.isSave) {
                    //目录创建模块脚本为空才提示
                    if (vm.actions.length == 0 && vm.isDirectory && vm.dragErrorMsg) {
                        return DialogService.alert(vm.dragErrorMsg);
                    }
                    vm.isValidJsonBlock() && _validGrammar() && scriptJsonInstance.save(vm.testcase, $stateParams.key).then(_leave)
                } else {
                    _leave()
                }

                function _leave(data) {
                    if (vm.isTestcaseDetail) {
                        $state.go("app.testcases", {selectNodeId: vm.testcase.id}, {reload: true});
                    } else {
                        $state.go("app.component", {selectedComponentId: vm.isDirectory ? (data ? data.id : $stateParams.id) : $stateParams.id}, {reload: true});
                    }
                }
            }

            function _validGrammar() {
                var valid = true;
                _.forEach(TESTCASE_ENUM.grammarCheck, function(grammar) {
                    if (_findGrammar(grammar[0])) {
                        if (!_findGrammar(grammar[1])) {
                            valid = false;
                            DialogService.alert("脚本语法错误，" + grammar[0] + '必须和' + grammar[1] + '同时存在');
                            return false;
                        }
                    } else if (_findGrammar(grammar[1])) {
                        if (!_findGrammar(grammar[0])) {
                            valid = false;
                            DialogService.alert("脚本语法错误，" + grammar[0] + '必须和' + grammar[1] + '同时存在');
                            return false;
                        }
                    }
                });
                function _findGrammar(grammar) {
                    var result = false;
                    _.forEach(vm.actions, function(action) {
                        if (action.action == grammar) {
                            result = true;
                            return false;
                        }
                    });
                    return result;
                }
                return valid;
            }
        }

        function _notifySnapshotResize() {
            $rootScope.$broadcast("snapshot:resize");
        }

        // 高亮当前snapshot相关脚本块,并且根据参数判断是否滚动到该脚本块
        function _anchorScroll(index) {
            if (!_.isUndefined(index)) {
                $timeout(function() {
                    $location.hash("jsonBlock-" + index);
                    $anchorScroll();
                })
            }
        }

        function _getSnapshotKey() {
            if (!vm.snapshot) return;

            if (vm.snapshot.hasOwnProperty("componentName")) {
                vm.currentSelectedActionId = vm.snapshot.componentName;
            } else {
                vm.currentSelectedActionId = vm.snapshot.key;
            }
            return vm.currentSelectedActionId;
        }

        // 获取截图action的index:1.有参数表示获取当前截图action的index 2.没有参数表示获取当前操作的action对应的snapshot的action的index
        function _getSnapshotActionIndex(action, isGetFirst) {
            var actionId = action && action.actionId || _getSnapshotKey();
            return _.findIndex(vm.actions, function(a) {
                return (a.actionId == actionId && (isGetFirst || _.indexOf(TESTCASE_ENUM.snapshotActions, a.action) > -1)) || (a.componentName == actionId);
            });
        }
    }

    function PluginController($scope, $uibModalInstance, plugins) {
        $scope.plugins = plugins;
        $scope.executionWay = "plugin-dev";

        $scope.cancel = function() {
            $uibModalInstance.dismiss();
        }
        $scope.close = function() {
            if ($scope.form.$valid) {
                $scope.plugin.originTextValue = $scope.originTextValue || '';
                $scope.plugin.executionWay = $scope.executionWay;
                $uibModalInstance.close($scope.plugin);
            }
        }
    }

    function InsertComponentController($timeout, $scope, $uibModalInstance, $stateParams, componentService, components, scriptJsonInstance, TESTCASE_ENUM) {
        var vm = this;

        vm.components = components;
        vm.selectedComponents = [];
        vm.checkAliasValidated = checkAliasValidated;
        vm.removeSelected = removeSelected;
        vm.chooseSelectedComponent = chooseSelectedComponent;
        vm.setting = {
            edit: {
                enable: false
            },
            check: {
                enable: false,
            }
        };

        vm.errorMsg = "";
        vm.close = close;
        vm.cancel = cancel;

        _.each(vm.components, function(t) {
            t.displayName = t.name;
        });

        $scope.$on('tree.inited', function(e, api) {
            vm.caseTreeApi = api;
        });

        $scope.$on('node.afterClick', function(e, node) {
            e.stopPropagation();
            $scope.$apply(function() {
                if (!node.isParent) {
                    if (vm.errorMsg) {  //说明在上一个模块别名输入出错的时候切换模块
                        vm.errorMsg = "";
                        _.remove(vm.selectedComponents, function(component) {
                            return !component.alias
                                || !TESTCASE_ENUM.regular.alias.test(component.alias)
                                || _.filter(vm.selectedComponents, {alias: component.alias}).length != 1
                                || !scriptJsonInstance.isAbleAlias(component.alias);
                        });
                    }
                    vm.choose = {
                        name: node.name,
                        id: node.id,
                        alias: scriptJsonInstance.getDifferentAlias(_.map(vm.selectedComponents, 'alias')),
                        first_snapshot: node.first_snapshot
                    };
                    vm.selectedComponents.push(vm.choose);
                }
            });
        });

        function close() {
            vm.selectedComponents.length && $uibModalInstance.close(vm.selectedComponents);
        }

        vm.aliasValidated = true;
        function checkAliasValidated() {
            if (!vm.choose) {
                vm.aliasValidated = true;
                vm.errorMsg = "";
                return;
            }
            vm.aliasValidated = false;
            if (vm.choose.alias) {
                if (_.filter(vm.selectedComponents, {alias: vm.choose.alias}).length != 1 || !scriptJsonInstance.isAbleAlias(vm.choose.alias)) {
                    vm.errorMsg = "模块别名重复！";
                } else if (!TESTCASE_ENUM.regular.alias.test(vm.choose.alias)) {
                    vm.errorMsg = "模块别名必须以字母开头，可以由字母和数字组成！";
                } else {
                    vm.aliasValidated = true;
                }
            } else {
                vm.errorMsg = "模块别名不能为空！";
            }
            vm.aliasValidated && (vm.errorMsg = "");
        }

        function chooseSelectedComponent(component) {
            vm.choose = component;
        }

        function removeSelected(component) {
            _.remove(vm.selectedComponents, component);
            vm.choose == component && (vm.choose = "");
            vm.checkAliasValidated();
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

    function SpreadJsonBlockController($uibModalInstance, DialogService, model, TESTCASE_ENUM) {
        var vm = this;

        vm.model = model;
        vm.close = close;

        function close() {
            if(JSON.parse(vm.model.action).variableName && TESTCASE_ENUM.regular.isChineseReg.test(JSON.parse(vm.model.action).variableName)){
                DialogService.alert("variableName字段不能包含中文!");
                return;
            }
            try {
                vm.model.action = _.cloneDeep(JSON.parse(vm.model.action));
                $uibModalInstance.close(vm.model);
            } catch (e) {
                DialogService.alert("脚本格式错误!");
            }
        }

    }

    function MeasureNameController($uibModalInstance, actions) {
        var vm = this;

        vm.measureName = "";
        vm.nameIsExist = false;
        vm.actions = actions;

        vm.measureNameChange = measureNameChange;
        vm.close = close;
        vm.cancel = cancel;

        function measureNameChange() {
            vm.nameIsExist = _.find(vm.actions, {measureName: vm.measureName}) ? "" : "true";
        }

        function close() {
            $uibModalInstance.close(vm.measureName);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

    function ScriptGrammarController($uibModalInstance, scriptJsonInstance) {
        var vm = this;

        vm.grammars = ["if", "elif", "else", "endif", "while", "endwhile"];
        vm.conditions = [">", "<", ">=", "<=", "==", "!="];
        vm.variables = _.map(scriptJsonInstance.getAllParams(), "name");
        vm.model = {
            grammar: "请选择语法!",
            variable: "请选择变量!",
            condition: "请选择判断符!",
            input: "",
            action: {}
        };
        vm.action = "";

        vm.configAction = configAction;
        vm.close = close;
        vm.cancel = cancel;

        function configAction(type, value) {
            if (type == "grammar") {
                vm.model.grammar = value;
                vm.model.action.action = value;
            } else if (type == "variable") {
                vm.model.variable = value;
            } else if (type == "condition") {
                vm.model.condition = value;
            }

            if (type == "variable" || type == "condition" || type == "input") {
                var variable = vm.model.variable,
                    condition = vm.model.condition;
                if (_.isUndefined(vm.model.variable) || vm.model.variable == "请选择变量!") {
                    variable = "";
                }
                if (_.isUndefined(vm.model.condition) || vm.model.condition == "请选择判断符!") {
                    condition = "";
                }
                vm.model.action.condition = "{" + variable + "} " + condition + " " + vm.model.input;
            }
            vm.action = JSON.stringify(vm.model.action, null, 4)
        }

        function close() {
            $uibModalInstance.close(JSON.parse(vm.action));
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

    function customParamController($uibModalInstance, scriptJsonInstance) {
        var vm = this;
        vm.nameExist = true;
        vm.close = close;
        vm.cancel = cancel;
        vm.checkSameParameter = checkSameParameter;

        function close() {
            !scriptJsonInstance.hasSameParam(vm.name) && $uibModalInstance.close(vm.name);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function checkSameParameter() {
            vm.nameExist = scriptJsonInstance.hasSameParam(vm.name) ? "" : true;
        }
    }

    function configSectionController($scope, $uibModalInstance, $timeout, DialogService, actions, snapshots, nodes, TESTCASE_ENUM) {
        var vm = this,
            startIndex,
            endIndex;

        vm.actions = actions;
        vm.snapshots = _.cloneDeep(snapshots);
        vm.sections = [];
        vm.nodes = _.cloneDeep(nodes);
        vm.setting = {
            data: {
                simpleData: {
                    enable: true,
                    pIdKey: 'parent_id'
                }
            },
            view: {
                showIcon: true,
                showLine: false,
                dblClickExpand: false
            },
            callback: {
                onClick: _onClick
            }
        };

        vm.selectSnapshot = selectSnapshot;
        vm.removeSection = removeSection;
        vm.preStep = preStep;
        vm.sectionSnapshots = sectionSnapshots;
        vm.cancel = cancel;
        vm.close = close;

        init();

        function init() {
            /**
             *根据脚本生成sections,并选中截图
             **/
            _.each(vm.actions, function(action, index) {
                if (action.action == "beginSection") {
                    vm.sections.push({
                        code: action.section,
                        name: (_.find(vm.nodes, {"code": action.section}) || {name: "undefined"}).name,
                        startIndex: index,
                        endIndex: _.findIndex(vm.actions, {"action": "endSection", "section": action.section})
                    })
                }
            });

            _.each(vm.sections, function(section) {
                var start = _.find(vm.actions.slice(section.startIndex, section.endIndex), function(action) {
                    return action.actionId || action.componentName;
                });

                var end = _.findLast(vm.actions.slice(section.startIndex, section.endIndex), function(action) {
                    return action.actionId || action.componentName;
                });

                section.startIndex = _.findIndex(vm.snapshots, function(snapshot) {
                    return snapshot.key == start.actionId || snapshot.key == start.componentName;
                });

                section.endIndex = _.findIndex(vm.snapshots, function(snapshot) {
                    return snapshot.key == end.actionId || snapshot.key == end.componentName;
                });

                _.each(vm.snapshots, function(snapshot, i) {
                    if (i >= section.startIndex && i <= section.endIndex) {
                        snapshot.isSelected = true;
                    }
                });
            });

            /**
             * 删除已经作为section的node
             * */
            _.remove(vm.nodes, function(node) {
                return _.map(vm.sections, "code").indexOf(node.code) > -1;
            })
        }

        function selectSnapshot(index) {
            if (_.isUndefined(startIndex)) {
                if (vm.snapshots[index].isSelected) {
                    DialogService.alert("section不能存在重复的截图!")
                } else {
                    startIndex = index;
                    vm.snapshots[startIndex].isSelected = true;
                }
            } else {
                if (_.filter(vm.snapshots.slice(_.min([startIndex, index]), _.max([startIndex, index]) + 1), {"isSelected": true}).length > 1) {
                    DialogService.alert("section不能存在重复的截图!");
                } else {
                    endIndex = _.max([startIndex, index]);
                    startIndex = _.min([startIndex, index]);

                    _.each(vm.snapshots, function(snapshot, i) {
                        if (i >= startIndex && i <= endIndex) {
                            snapshot.isSelected = true;
                        }
                    });

                    $timeout(function() {
                        _getTreeObj().expandNode(_getTreeObj().getNodes()[0]);
                    });
                    vm.showTestcaseTree = true;
                }
            }
        }

        function removeSection(section) {
            vm.nodes = _.clone(nodes);
            _.remove(vm.sections, {code: section.code});

            _.each(vm.snapshots, function(snapshot, i) {
                if (i >= section.startIndex && i <= section.endIndex) {
                    snapshot.isSelected = false;
                }
            });

            _.remove(vm.nodes, function(node) {
                return _.map(vm.sections, "code").indexOf(node.code) > -1;
            })
        }

        function preStep() {
            _.each(vm.snapshots, function(snapshot, i) {
                if (i >= startIndex && i <= endIndex) {
                    snapshot.isSelected = false;
                }
            });
            startIndex = endIndex = undefined;
            vm.showTestcaseTree = false;
        }

        function sectionSnapshots(section) {
            vm.section = {
                name: section.name,
                snapshots: vm.snapshots.slice(section.startIndex, section.endIndex + 1)
            }
        }

        function close() {
            _.remove(vm.actions, function(action) {
                return action.action == "beginSection" || action.action == "endSection";
            });

            var actions = _.cloneDeep(vm.actions);

            _.each(vm.sections, function(section) {
                var index = _.findIndex(actions, function(action) {
                    return action.actionId && (action.actionId == vm.snapshots[section.startIndex].key) || action.componentName && (action.componentName == vm.snapshots[section.startIndex].componentName)
                });
                actions.splice(index, 0, {
                    "action": "beginSection",
                    "section": section.code
                });


                index = _.findLastIndex(actions, function(action) {
                    return action.actionId && (action.actionId == vm.snapshots[section.endIndex].key) || action.componentName && (action.componentName == vm.snapshots[section.endIndex].componentName)
                });
                actions.splice(index + 1, 0, {
                    "action": "endSection",
                    "section": section.code
                });
            });

            $uibModalInstance.close(actions);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("section-tree");
        }

        function _onClick(event, treeId, treeNode) {
            $scope.$apply(function() {
                if (treeNode.type == TESTCASE_ENUM.type.case) {
                    vm.sections.push({code: treeNode.code, name: treeNode.name, startIndex: startIndex, endIndex: endIndex});
                    vm.showTestcaseTree = false;
                    startIndex = endIndex = undefined;
                }
            });

            _.remove(vm.nodes, {"code": treeNode.code})
        }
    }

    function FormulaScriptController($scope, $uibModalInstance, model) {
        var vm = this;

        vm.model = model;
        vm.nameExist = false;

        vm.checkSameAlias = checkSameAlias;
        vm.close = close;
        vm.cancel = cancel;

        function checkSameAlias() {
            vm.nameExist = _.find(model.formulaScripts, {name: vm.model.fileAlias}) ? '' : 'true';
        }

        function close() {
            $uibModalInstance.close(model);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }
})();



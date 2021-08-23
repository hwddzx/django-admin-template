(function () {

    angular.module('quail.testcases')
        .factory("ScriptJsonService", ScriptJsonService);

    function ScriptJsonService($http, $q, $log, $filter, TestCaseService, componentService, DataService, FileService, UploadService, ModalService, DialogService, TESTCASE_ENUM) {
        var service = {
                init: init,
                isMainControlAction: isMainControlAction,
                isParamAction: isParamAction,
                isComponent: isComponent,
                getComponentParamByIds: getComponentParamByIds,
                getScriptJsonInstance: getScriptJsonInstance,
                saveTestcaseScriptJson: saveTestcaseScriptJson,
                saveComponentScriptJson: saveComponentScriptJson
            },
            scriptJsonCache = [];

        return service;

        function init(testcase, isTestcaseDetail) {
            var
                scriptJson = testcase.script_json,
                actions = scriptJson.actions,
                appComponents = [], //存放从接口中获取的模块用于添加模块成功后查找模块id获取参数
                testcaseParams = [],
                componentParams = [],
                customParams = [],
                globalVariables = [],
                componentOriginalParams = _convertComponentParams(testcase.component_values),
                steps = [],
                formulaInstance,
                formulas = [],
                formulaScriptFilesCache = {};

            if (!scriptJson.dataSet) {
                scriptJson.dataSet = {
                    headers: [],
                    data: {}
                }
            }

            _.forEach(actions, function (action) {
                service.isParamAction(action) && _addTestcaseParam(action);
                service.isMainControlAction(action) && _addStep(action, true);
            });

            // 判断是否为自定义参数，初始化时先保存自定义参数
            _.forEach(scriptJson.dataSet.data, function(value, key) {
                if (!value.component && !_.find(testcaseParams, {name: key})) {
                    value.name = key;
                    customParams.push(value);
                }
            })

            scriptJsonCache[testcase.id] = {
                id: testcase.id,
                isTestcaseDetail: isTestcaseDetail,
                isDirectory: !!testcase.type,
                formulaScripts: scriptJson.formula_scripts || [],
                getActions: getActions,
                setActions: setActions,
                addAction: addAction,
                removeAction: removeAction,
                modifyAction: modifyAction,
                getMainAction: getMainAction,
                getMainActionTemplate: getMainActionTemplate,
                getSteps: getSteps,
                getHasParamsSteps: getHasParamsSteps,
                insertComponent: insertComponent,
                syncComponentParams: syncComponentParams,
                getAllParams: getAllParams,
                hasSameParam: hasSameParam,
                isAbleAlias: isAbleAlias,
                getDifferentAlias: getDifferentAlias,
                getComponentAliases: getComponentAliases,
                // getParamsByAction: getParamsByAction,
                initDataSetsInstance: initDataSetsInstance,
                getDataSets: getDataSets,
                initFormulaInstance: initFormulaInstance,
                getFormulas: getFormulas,
                getFormulaScripts: getFormulaScripts,
                addFormulaScript: addFormulaScript,
                updateFormulaScript: updateFormulaScript,
                deleteFormulaScript: deleteFormulaScript,
                uploadFormulaScripts: uploadFormulaScripts,
                setGlobalVariables: setGlobalVariables,
                hideGlobalVariable: hideGlobalVariable,
                getparamBaseName: getparamBaseName,
                save: save,
                updateTestcaseParams: updateTestcaseParams
            };

            return scriptJsonCache[testcase.id];

            function save(testcase, appKey) {
                var self = this, component = {};
                if (self.isDirectory) { // 创建模块
                    component = {
                        name: testcase.name,
                        type: 0,
                        script_json: {actions: [testcase.script_json.actions.pop()]},
                        orin_testcase_id: testcase.origin_testcase_id,
                        parent_id: testcase.id
                    };
                    return componentService.saveComponent(appKey, [component]);
                } else { // 保存脚本
                    TestCaseService.reConfigScriptJson(testcase.snapshots, testcase.script_json, true);
                    if (self.isTestcaseDetail) { // 保存用例脚本
                        return self.uploadFormulaScripts().then(function() {
                                testcase.script_json.dataSet = self.getDataSets();
                                testcase.script_json.formulas = self.getFormulas();
                                testcase.script_json.formula_scripts = self.getFormulaScripts();
                                return testcase.script_json;
                            }).then(function(scriptJson) {
                                return service.saveTestcaseScriptJson(self.id, scriptJson);
                            });
                    } else { // 保存模块脚本
                        testcase.patch = true; //patch为true表示更新已有截图配置,没有patch表示更新模块
                        return service.saveComponentScriptJson(self.id, testcase);
                    }
                }
            }

            //action管理
            function removeAction(index) {
                var action = actions[index];

                // 删除截图action脚本,需要把actionId相同的action脚本一同删除
                if (service.isMainControlAction(action)) {
                    _.remove(actions, function(a) {
                        return (a.actionId && action.actionId == a.actionId) || (a.componentName && action.componentName == a.componentName);
                    });
                    _removeStep(action);
                } else {
                    // _.remove()在action为"{}"的时候会删除所有action;
                    actions.splice(index, 1);
                }

                //setText即是MainControlAction又是ParamAction
                service.isParamAction(action) && _removeTestcaseParam(action);
                return this.getActions();
            }

            function addAction(action, index) {
                actions.splice(index, 0, action);
                service.isParamAction(action) && _addTestcaseParam(action);
                service.isMainControlAction(action) && _addStep(action);
                return this.getActions();
            }

            function modifyAction(newAction, index) {
                var oldAction = actions[index];
                if (service.isComponent(oldAction)) {
                    DialogService.alert('不能修改已引入模块!');
                } else {
                    if (service.isParamAction(oldAction)) {
                        //在修改action时只有oldParamName与newParamName不等时才修改参数
                        var oldParamName = oldAction.variableName || oldAction.params[0].name;
                        newParamName = newAction.variableName || newAction.params[0].name;
                        if (oldParamName != newParamName) {
                            _removeTestcaseParam(oldAction);
                            _addTestcaseParam(newAction);
                        }
                    }
                    actions.splice(index, 1, newAction);
                }
                return this.getActions();
            }

            // 目录创建模块时,actions可能被覆盖,使用originActions
            function getMainAction(originActions, actionId) {
                return _.clone(_.find(originActions || actions, function(action) {
                    return action.actionId == actionId && service.isMainControlAction(action);
                }));
            }

            function getMainActionTemplate(originActions, actionId) {
                var action = this.getMainAction(originActions, actionId);
                action.clickMode = 0;
                action.repeat = 0;
                action.clickImage = undefined;
                action.xPath = undefined;
                action.params = undefined;
                action.clickNode = undefined;
                action.xPathWithoutResId = undefined;
                return action;
            }

            function getActions() {
                return _.cloneDeep(actions); // ——.cloneDeep可以改变数组指针,是angular可以重新repeat actions;
            }

            function setActions(newActions) {
                return actions = newActions;
            }

            function getAllParams() {
                return _.flatten([testcaseParams, componentParams, customParams]);
            }

            // 同步模块参数
            function syncComponentParams() {
                var oldComponentParams = componentParams;
                componentParams = [];
                return _getComponentsParams().then(function() {
                    _.forEach(_getComponentsByActions(), function(component) {
                        //重新获取模块参数数据前缓存模块之前数据到dataSet中
                        _.forEach(oldComponentParams, function(param){
                            if(param.component == component.baseName) scriptJson.dataSet.data[param.name] = param;
                        })
                        _addComponentParams(component);
                    });
                   return componentParams;
                });
            }

            function hasSameParam(paramName) {
                return _.find(_.flatten([testcaseParams, customParams]), {
                    name: paramName
                });
            }

            function getComponentAliases() {
                return _getComponentsByActions().map(function (component) {
                    return component.alias;
                });
            }

            function getDifferentAlias(newAliasesList) {
                !newAliasesList && (newAliasesList = []);
                return DataService.getDifferentStr( _.flatten([this.getComponentAliases(), newAliasesList]), 'M');
            }

            function isAbleAlias(alias) {
                var customsFromComponent = [];
                //导出脚步后模块展开，之后模块取名不能和已展开模块名重复
                _.forEach(customParams, function(param) {
                    var arr = param.name.split("__");
                    if (arr[1]) customsFromComponent.push(arr[0]);
                });
                return _.flatten([customsFromComponent, this.getComponentAliases()]).indexOf(alias) == -1;
            }

            function insertComponent(key, index) {
                var self = this;
                return ModalService.show({
                    templateUrl: 'apps/testcase/detail/templates/insert.component.modal.html',
                    controller: "InsertComponentController",
                    controllerAs: "vm",
                    size: 'hg',
                    resolve: {
                        components: function () {
                            return componentService.getComponents(key).then(function (components) {
                                return (appComponents = components);
                            });
                        },
                        scriptJsonInstance: this
                    }
                }).then(function(components) {
                    var component;
                    while ((component = components.pop())) {
                        self.addAction({componentName: component.name + '#' + component.alias, first_snapshot: component.first_snapshot}, index);
                    }
                    return self.getActions();
                });
            }

            function _addComponentParams(component) {
                _.forEach(componentOriginalParams[component.baseName], function (item, key) {
                    var param = {
                        name: component.alias ? component.alias + '__' + key : key,
                        originalValue: item.value,
                        action: item.action,
                        ignore: item.ignore,
                        regExp: item.regExp,
                        component: component.baseName
                    };
                    if (!param.name) return;
                    _setParam(param);
                    componentParams.push(param);
                });
            }

            function _getComponentsParams() {
                // 过滤出新增的模块id
                var ids = _.chain(_getComponentsByActions())
                    .uniqBy('baseName')
                    .filter(function(component) {
                        return !componentOriginalParams[component.baseName];
                    })
                    .map(function(component) {
                        var originalComponent = _.find(appComponents, {name: component.baseName});
                        if (!originalComponent) {
                            //不能从componentOriginalParams中读取到
                            //也不能从appComponents找到对应的模块
                            //若手动加模块或者手动改模块名会执行到这
                            $log.error(component);
                            return null;
                        } else {
                            return originalComponent.id;
                        }
                    })
                    .filter(function(id) {
                        return id !== null;
                    })
                    .value();
                if (ids.length) {
                    return service.getComponentParamByIds(ids).then(function(res) {
                        return _.merge(componentOriginalParams, _convertComponentParams(res));
                    });
                } else {
                    return $q.when(componentOriginalParams);
                }
            }

            function _getComponentsByActions() {
                return _.filter(actions, isComponent).map(function (action) {
                    var splitName = action.componentName.split("#");
                    return {
                        name: action.componentName,
                        baseName: splitName[0],
                        alias: splitName[1]
                    };
                });
            }

            function _addTestcaseParam(action) {
                var param = {
                    actionId: action.actionId,
                    action: action.action,
                    ignore: action.ignoreAction,
                    regExp: action.variableRegex,
                    component: ''
                };
                if (action.variableName) {
                    param.name = action.variableName;
                    param.originalValue = action.expect;
                } else if (action.params && action.params[0].name) {
                    param.name = action.params[0].name;
                    param.originalValue = action.action == "setText" ? action.params[0].value : action.params[0].value.split(" ")[1];
                }
                if (!param.name) return;
                _setParam(param);
                testcaseParams.push(param);
            }

            function _removeTestcaseParam(action) {
                var paramName = action.variableName || action.params[0].name;
                if (paramName) {
                    _.remove(testcaseParams, {name: paramName});
                    //删除action同时删除dataSet数据
                    delete scriptJson.dataSet.data[paramName];

                    if (_.isEmpty(scriptJson.dataSet.data)) {
                        scriptJson.dataSet.headers = [];
                    }
                }
            }

            function _setParam(param) {
                if (_.isEmpty(scriptJson.dataSet.headers)) {
                    scriptJson.dataSet.headers = ['新增数据1'];
                }
                //借助dataSet缓存参数别名和参数值
                var dataSetParam = scriptJson.dataSet.data[param.name] = scriptJson.dataSet.data[param.name] || {
                        alias: param.name,
                        values: [(param.component || param.regExp == TESTCASE_ENUM.regular.matchAll) ? "" : param.originalValue]// 新增模块参数或参数为全匹配时,values传""给后台
                    };
                param.alias = dataSetParam.alias;
                param.values = dataSetParam.values;
                param.isMatchAllRegexp = param.regExp == TESTCASE_ENUM.regular.matchAll;
            }

            function updateTestcaseParams(data) {
                testcaseParams = data;
            }

            function initDataSetsInstance() {
                var instance = {
                    headers: scriptJson.dataSet.headers,
                    changeHeaders: changeHeaders,
                    data: this.getAllParams(),
                    testcaseParams: testcaseParams,
                    componentParams: componentParams,
                    customParams: customParams,
                    addCustomParam: addCustomParam,
                    removeCustomParam: removeCustomParam,
                    getDifferentName: getDifferentName,
                    addData: addData,
                    removeData: removeData,
                    isCanDeleteParam: isCanDeleteParam,
                    exportDataSet: exportDataSet,
                    hasSameHeaderName: hasSameHeaderName,
                    getOriginValueByName: getOriginValueByName
                };

                return instance;


                function hasSameHeaderName(name) {
                    return instance.headers.indexOf(name) !==  instance.headers.lastIndexOf(name);
                }

                function addCustomParam(name, values, alias) {
                    this.customParams.push({
                        name: name,
                        alias: alias || name,
                        values: values || []
                    });
                }

                function removeCustomParam(name) {
                    _.remove(this.customParams, {name: name});
                }

                function changeHeaders(headers) {
                    this.headers = scriptJson.dataSet.headers = headers;
                }

                function exportDataSet() {
                    var rows = [_.flatten(['参数名', '参数类型', '参数来源', '显示名', this.headers])];
                    _.forEach(_.flatten([this.testcaseParams, this.componentParams]), function (item) {
                        if (!hideGlobalVariable(item) && !item.isMatchAllRegexp) {
                            rows.push(_.flatten([item.name, $filter("actionTybe")(item.action), item.component ? '模块' + item.component : '用例', item.alias, item.values == '' ? item.originalValue : item.values]));
                        }
                    });
                    _.forEach(this.customParams, function(item) {
                        rows.push(_.flatten([item.name, "自定义", "自定义", item.alias, item.values]));
                    })
                    return rows;
                }

                function addData() {
                    this.headers.push(this.getDifferentName());
                }

                function removeData(index) {
                    this.headers.splice(index, 1);
                    _.forEach(this.data, function (item) {
                        item.values.splice(index, 1);
                    });

                    var cols = scriptJson.dataSet.appoint_cols;
                    _.includes(cols, index) && cols.splice(_.indexOf(cols, index), 1);
                    // 删除中间的参数列,该列在cols中的index都需要减1
                    if (index < _.max(cols)) {
                        _.each(cols, function(value, i) {
                            value >= index && cols[i]--;
                        })
                    }
                }

                function isCanDeleteParam() {
                    // 至少保留一列数据
                    return this.headers.length > 1;
                }

                function getDifferentName() {
                    return DataService.getDifferentStr(this.headers, '新增数据');
                }

                function getOriginValueByName(name) {
                    var temp = _.find(this.data, {name: name});
                    return temp.regExp == TESTCASE_ENUM.regular.matchAll ? "*(匹配任一值)" : temp.originalValue;
                }
            }

            function getDataSets() {
                var params = this.getAllParams();
                if (params.length) {
                    return {
                        headers: scriptJson.dataSet.headers,
                        data: _getRows(),
                        appoint_cols: _.isEmpty(scriptJson.dataSet.appoint_cols) ? undefined : scriptJson.dataSet.appoint_cols
                    };
                } else {
                    return undefined;
                }

                function _getRows() {
                    var rows = {};
                    _.forEach(params, function (item) {
                        rows[item.name] = _.pick(item, ['alias', 'component', 'values']);
                    });
                    return rows;
                }
            }

            function initFormulaInstance() {
                if (formulaInstance) return formulaInstance;
                formulaInstance = {
                    data: formulas,
                    getParams: this.getAllParams,
                    addFormula: addFormula,
                    clearData: clearData,
                    deleteFormula: deleteFormula,
                    checkValidated: checkValidated,
                    exportFormulas: exportFormulas,
                    formulaValidatedMsg: formulaValidatedMsg,
                    hasSameName: hasSameName
                };
                _.forEach(scriptJson.formulas || [], function(formula) {
                    formulaInstance.addFormula(formula.formula, formula.name);
                });
                return formulaInstance;

                function addFormula(data, name) {
                    var formula = {
                        name: name || DataService.getDifferentStr(_.map(formulas, 'name'), '表达式'),
                        formula: data || ""
                    };
                    this.checkValidated(formula);
                    formulas.push(formula);
                }

                function clearData() {
                    this.data = formulas = [];
                }

                function deleteFormula(name,index) {
                    var formulas = this;
                    DialogService.confirm("确定删除" + name + "吗?").then(function () {
                        formulas.data.splice(index, 1);
                    });
                }

                function exportFormulas() {
                    var rows = [];
                    _.forEach(this.data, function (value) {
                        rows.push([value.name, value.formula]);
                    });
                    return rows;
                }

                function hasSameName(formula) {
                    var allNames = _.map(formulas, 'name');
                    formula.isNameValidated = allNames.indexOf(formula.name) == allNames.lastIndexOf(formula.name);
                }

                function checkValidated(formula) {
                    var params = this.getParams();
                    formula.isValidated = true;
                    formula.ignore = false;
                    TESTCASE_ENUM.regular.validFormula.test(formula.formula) || (formula.isValidated = false);
                    if(!formula.formula.match(TESTCASE_ENUM.regular.extractionFormulaParam)) {
                        formula.isValidated = false;
                        return;
                    }
                    _.forEach(formula.formula.match(TESTCASE_ENUM.regular.extractionFormulaParam), function (variable) {
                        var param = _.find(params, {
                            name: variable.slice(1, -1)
                        });
                        if (param) {
                            param.ignore && (formula.ignore = param.ignore);
                        } else {
                            formula.isValidated = false;
                        }
                    });
                }

                function formulaValidatedMsg() {
                    var msg;
                    for(var i in this.data){
                        if(this.data[i].formula == ''){
                            msg = this.data[i].name+'赋值不能为空!'
                            return msg;
                        }
                    }
                    if (_.find(this.data, {isValidated: false})) msg = "表达式错误";
                    if (_.find(this.data, {isNameValidated: false})) msg = "表达式名字重复";
                    return msg;
                }
            }

            function getFormulas() {
                if (!formulaInstance) this.initFormulaInstance();
                if (formulas.length) {
                    return _.map(formulas, function (formula) {
                        return {
                            name: formula.name,
                            formula: formula.formula
                        };
                    });
                } else {
                    return undefined;
                }
            }

            //formulaScript
            function getFormulaScripts() {
                if (this.formulaScripts.length) {
                    return _.map(this.formulaScripts, function(item) {
                        return {
                            name: item.name,
                            url: item.url
                        };
                    });
                }
            }

            function addFormulaScript(files) {
                if (_.isEmpty(files)) return;
                var file = files[0],
                    self = this;
                if (file.name.split(".")[1] != "py") {
                    DialogService.alert("请上传py结尾的Python文件");
                    return;
                }
                ModalService.show({
                    templateUrl: 'apps/testcase/detail/templates/upload.python.modal.html',
                    controller: "FormulaScriptController",
                    controllerAs: "vm",
                    resolve: {
                        model: function() {
                            return {
                                formulaScripts: self.formulaScripts,
                                fileName: file.name,
                                fileAlias: ""
                            }
                        }
                    }
                }).then(function(model) {
                    var key = UploadService.getFileKey(file, 'py');
                    formulaScriptFilesCache[key] = file;
                    self.formulaScripts.push({
                        name: model.fileAlias,
                        key: key
                    });
                });
            }


            function uploadFormulaScripts() {
                var self = this,
                    promises = [];
                _.forEach(formulaScriptFilesCache, function(file, key) {
                    var curScript = _.find(self.formulaScripts, {key: key});
                    if (curScript) {
                        promises.push(
                            UploadService.upload(file, key).then(function(url) {
                                curScript.url = url;
                            })
                        );
                    }
                });
                return $q.all(promises);
            }

            function setGlobalVariables(variables) {
                globalVariables = variables;
            }

            function hideGlobalVariable(param) {
                var self = this;
                var temp = _.find(globalVariables, {name: getparamBaseName(param)});
                return temp && temp.value;
            }

            function getparamBaseName(param) {
                return param.component ? param.name.split("__")[1] : param.name;
            }

            function updateFormulaScript(script) {

                var promise = script.key ? FileService.readAsText(formulaScriptFilesCache[script.key]) : (script.url ? DataService.crossGet(script.url) : $q.when("")),
                    self = this;

                promise.then(function(data) {
                    ModalService.show({
                        templateUrl: "apps/testcase/detail/templates/edit.python.modal.html",
                        windowClass: "dialog-edit-python",
                        controller: "FormulaScriptController",
                        controllerAs: "vm",
                        resolve: {
                            model: function() {
                                return {
                                    formulaScripts: self.formulaScripts,
                                    script: data,
                                    fileAlias: script.name
                                }
                            }
                        }
                    }).then(function(model) {
                        var curScript = _.find(self.formulaScripts, script.url ? {url: script.url} : {name: script.name});
                        curScript.key = curScript.key || curScript.url.substring(curScript.url.lastIndexOf("/") + 1);
                        curScript.name = model.fileAlias;
                        formulaScriptFilesCache[curScript.key] = new Blob([model.script], {type: 'text/plain'});
                    });
                })
            }

            function deleteFormulaScript(formulaScript) {
                if (!formulaScript) return;
                var self = this;
                DialogService.confirm("您确定删除吗?").then(function() {
                    _.remove(self.formulaScripts, formulaScript);
                });
            }

            //step管理
            function getSteps() {
                return steps;
            }

            function getHasParamsSteps() {
                return _.filter(steps, function (step) {
                    return _.find(testcaseParams, {
                        actionId: step.key
                    });
                });
            }

            function _addStep(action, isNotUpdateSnapshots) {
                var index = _getStepIndex(action);
                var step = {
                    key: action.actionId || action.componentName,
                    resourceId: action.resourceId,
                    first_snapshot: action.first_snapshot,
                    isComponent: service.isComponent(action)
                };
                steps.splice(index, 0, step);

                if (!isNotUpdateSnapshots) {
                    testcase.snapshots.splice(index, 0, TestCaseService.createSnapshotByAction(testcase, action));
                }else {
                    delete action.first_snapshot;
                }
            }

            function _getStepIndex(action) {
                return _.findIndex(_.filter(actions, function(action) {
                    return service.isMainControlAction(action);
                }), service.isComponent(action) ? {componentName: action.componentName} : {actionId: action.actionId})
            }

            function _removeStep(action) {
                if (service.isComponent(action)) {
                    _.remove(steps, {key: action.componentName});
                    _.remove(testcase.snapshots, {key: action.componentName});
                    //删除模块时删除dataSet数据
                    _.forEach(scriptJson.dataSet.data, function(value, key) {
                        if (key.split("__")[0] === action.componentName.split("#")[1]) {
                            delete scriptJson.dataSet.data[key];
                        }
                    });
                    if (_.isEmpty(scriptJson.dataSet.data)) {
                        scriptJson.dataSet.headers = [];
                    }
                } else {
                    _.remove(steps, {key: action.actionId});
                    _.remove(testcase.snapshots, {key: action.actionId});
                }
            }

            function _convertComponentParams(backendComponentParams) {
                var componentsParams = {};
                _.forEach(backendComponentParams, function(component) {
                    _.merge(componentsParams, component.component_params);
                });
                return componentsParams;
            }
        }

        function getScriptJsonInstance(id) {
            return scriptJsonCache[id];
        }

        function getComponentParamByIds(ids) {
            return $http.get("/api/testcase/component/params/", {params: {component_ids: ids.join(",")}}).then(function(res) {
                return res.data;
            });
        }

        function isMainControlAction(action) {
            return (TESTCASE_ENUM.mainControlActions.indexOf(action.action) > -1 && action.actionId) || service.isComponent(action);
        }

        function isParamAction(action) {
            return TESTCASE_ENUM.paramActions.indexOf(action.action) > -1 && action.actionId;
        }

        function isComponent(action) {
            return !!action.componentName;
        }

        function saveTestcaseScriptJson(id, scriptJson) {
            return $http.post("/api/testcase/" + id + "/snapshot/batch/", {
                script_json: scriptJson
            });
        }

        function saveComponentScriptJson(id, scriptJson) {
            return $http.post("/api/testcase/component/" + id + "/", scriptJson).then(function (res) {
                return res.data;
            });
        }
    }
})();
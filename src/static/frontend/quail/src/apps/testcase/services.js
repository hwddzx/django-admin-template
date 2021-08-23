(function() {

    angular.module('quail.testcases')
        .factory("TestcasesService", TestcasesService)
        .factory("TestCaseService", TestCaseService)
        .factory("RegexpsTemplateService", RegexpsTemplateService)
        .factory("TagService", TagService);

    function TestcasesService($http, TestCaseService, TESTCASE_ENUM) {
        var service = {
                createTestcases: createTestcases,
                getTestcases: getTestcases,
                addTestcase: addTestcase,
                deleteTestcase: deleteTestcase,
                moveTestcase: moveTestcase
            },
            currentFilterConditions = [];

        return service;

        function createTestcases(appId) {
            return service.getTestcases(appId).then(function(data) {
                return {
                    appId: appId,
                    data: data,
                    filteredData: data,
                    filterData: filterData,
                    addNewData: addNewData,
                    move: service.moveTestcase,
                    deleteData: deleteData,
                    getNewName: getNewName,
                    getScenarios: getScenarios,
                    getCases: getCases
                };
            });

            function filterData(scriptStatus, debugStatus, fastModeStatus, checkedFilterTags, tagFilterType) {
                if (!_.isEmpty(arguments)) {
                    currentFilterConditions = arguments;
                } else {
                    scriptStatus = currentFilterConditions[0];
                    debugStatus = currentFilterConditions[1];
                    fastModeStatus = currentFilterConditions[2];
                    checkedFilterTags = currentFilterConditions[3]
                }
                this.filteredData = _.filter(this.data, function(t) {
                    return t.type == TESTCASE_ENUM.type.scenario ||
                        _.includes(scriptStatus.value, t.script_status) &&
                        _.includes(debugStatus.value, t.is_submitted) &&
                        _.includes(fastModeStatus.value, t.fast_mode) &&
                        _filterTestcaseByTag(t)
                });

                function _filterTestcaseByTag(testcase) {
                    if (_.isEmpty(checkedFilterTags)) return true;
                    if (_.isArray(checkedFilterTags)) {
                        return tagFilterType == 'or' ? !_.isEmpty(_.intersection(testcase.tags, checkedFilterTags)) : _.intersection(testcase.tags, checkedFilterTags).length == checkedFilterTags.length;
                    } else {
                        return _.isEmpty(testcase.tags) || !_.isEmpty(_.intersection(testcase.tags, checkedFilterTags.checkedFilterTags))
                    }
                }
            }

            function addNewData(type, parentId) {
                var testcases = this,
                    data =  {
                        parent_id: parentId,
                        name: this.getNewName(type),
                        type: type,
                        desc: "",
                        status: TESTCASE_ENUM.status.not_in_recording,
                        script_status: TESTCASE_ENUM.scriptStatus.none_script,
                        is_submitted: false,
                        has_script: false,
                        is_distribute: false,
                        fast_mode: false,
                        permission: _.find(testcases.data, {id: parentId}).permission
                    };
                return service.addTestcase(this.appId, data).then(function(res) {
                    var newTestCase = _.merge(data, res);
                    testcases.data.push(newTestCase);
                    testcases.filterData();
                    return newTestCase;
                });
            }

            function deleteData(node) {
                var testcases = this;
                return service.deleteTestcase(node.id).then(function () {
                    removeTestcaseByNode(node);
                    function removeTestcaseByNode(node) {
                        _.remove(testcases.data, {id: node.id});
                        testcases.filterData();
                        node.isParent && _.forEach(node.children, removeTestcaseByNode);
                    }
                    return testcases.filteredData;
                });
            }

            function getNewName(type) {
                var counter = 1,
                    isTestcase = type === TESTCASE_ENUM.type.case,
                    baseName = isTestcase ? '新增用例': '新增场景';
                while(_.find(isTestcase ? this.getCases() : this.getScenarios(), { name: baseName + counter })) {
                    counter ++;
                }
                return  baseName + counter;
            }

            function getScenarios() {
                return _.filter(this.data, { type: TESTCASE_ENUM.type.scenario });
            }

            function getCases() {
                return _.filter(this.data, { type: TESTCASE_ENUM.type.case });
            }
        }

        function getTestcases(appId, hasScript) {
            var params = hasScript ? { has_script: true } : {};
            return $http.get("/api/testcase/app/" + appId + "/", { params: params }).then(function(res) {
                res.snapshots = [];
                return res.data;
            });
        }

        function deleteTestcase(id) {
            return $http.delete("/api/testcase/" + id + "/", { data: {} }).then(function(res) {
                return res.data;
            });
        }

        function addTestcase(appId, data) {
            return $http.post("/api/testcase/app/" + appId + "/", data).then(function(res) {
                return res.data;
            });
        }

        function moveTestcase(param) {
            return $http.post("/api/testcase/" + param.ids[0] + "/", param).then(function(res) {
                return res.data;
            });
        }
    }

    function TestCaseService($http, $upload, $q, config, UploadService, DialogService, DataService, TESTCASE_ENUM, TESTCASE_VALIDATE_VALUE) {

        var filesCache = {};

        return {
            copyScript: function(id, params) {
                return $http.post('/api/testcase/' + id + '/copy/', {
                    code: params.codeId || undefined,
                    ignores: params.ignores
                }).then(function(res) {
                    return res.data;
                })
            },
            uploadScript: function(url, blob){
                return $http.put(url, blob, {
                    withCredentials: false,
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': undefined,
                        'Token': undefined
                    }
                });
            },
            // 获取场景和用例列表
            getTestCases: function(appId, hasScript) {
                var params = hasScript ? { has_script: true } : {};
                return $http.get("/api/testcase/app/" + appId + "/", { params: params }).then(function(res) {
                    return res.data;
                })
            },
            // 新增场景或用例
            addTestCase: function(appId, data) {
                return $http.post("/api/testcase/app/" + appId + "/", data).then(function(res) {
                    return res.data;
                })
            },
            // 查看场景或用例详情
            getTestCase: function(caseId) {
                var _this = this,
                    scriptJson;
                return $http.get("/api/testcase/" + caseId + "/").then(function(res) {
                    //清空之前缓存的文件
                    filesCache = {};
                    scriptJson = res.data.script_json;

                    config.url_prefix = res.data.url_prefix;
                    _this.createSnapshotsByScriptJson(res.data);
                    // 老数据dataSets改成dataSet
                    if (scriptJson.dataSets) {
                        scriptJson.dataSet = scriptJson.dataSets;
                        delete scriptJson.dataSets;
                    }
                    return res.data;
                });
            },
            // excel导入导入用例
            importFromExcel: function(appId, file) {
                return $upload.upload({
                    url: "/api/testcase/app/" + appId + "/import/excel/",
                    method: 'post',
                    file: file
                }).then(function(res) {
                    return res.data;
                })

            },
            // 从已存在的执行用例批量导入用例
            importFromExecution: function(appId, executionIds) {
                return $http.post("/api/testcase/app/" + appId + "/import/execution/", { execution_ids: executionIds }).then(function(res) {
                    return res.data;
                })
            },
            // 保存编辑之后的场景或用例
            updateTestCase: function(caseId, data) {
                return $http.post("/api/testcase/" + caseId + "/", data).then(function(res) {
                    return res.data;
                })
            },
            // 删除场景或用例
            deleteTestCase: function(caseId) {
                return $http.delete("/api/testcase/" + caseId + "/", { data: {} }).then(function(res) {
                    return res.data;
                })
            },
            // 删除截图
            deleteSnapshots: function(caseId, keys) {
                return $http.delete("/api/testcase/" + caseId + "/snapshot/", { data: { snapshot_keys: keys } }).then(function(res) {
                    return res.data;
                })
            },
            updateSnapshot: function(caseId, snapshot, ignoreSpinner) {
                // return $q.when("");
                return $http.post("/api/testcase/" + caseId + "/snapshot/", snapshot, { ignoreSpinner: ignoreSpinner });
            },
            getPlugins: function() {
                // return $q.when([{ name: '输入验证码', path: '/srcripts/scirpt.sh' }]);
                return UploadService.getServerUrl().then(function(url) {
                    return $q(function(resolve, reject) {
                        $.ajax({
                            method: "get",
                            url: url + "replay_plugins",
                            // url: "http://file.lab.tb/upload/replay_plugins",
                            async: false,
                        }).done(function(data) {
                            //example: [{name:'输入验证码',path:'/srcripts/scirpt.sh'}]
                            resolve(JSON.parse(data));
                        }).fail(function(xhr, status) {
                            reject(status);
                        });
                    });
                });
            },

            getSnapshotOriginUrl: function(snapshot) {
                var originSuffix = "_o.jpg",
                    reg = /\.jpg$/;
                return snapshot.url.replace(reg, originSuffix);
            },

            getSnapshotLayouts: function(miniLayoutUrl) {
                if (!miniLayoutUrl) return $q.when();
                if (filesCache[miniLayoutUrl]) return $q.when(filesCache[miniLayoutUrl]);
                return DataService.crossGet(miniLayoutUrl, {ignoreErrAlert: true}).then(function(res) {
                    return (filesCache[miniLayoutUrl] = res);
                });
            },
            getXmlLayout: function(layoutUrl) {
                if (!layoutUrl) return $q.when();
                if (filesCache[layoutUrl]) return $q.when(filesCache[layoutUrl]);
                return DataService.crossGet(layoutUrl, {ignoreErrAlert: true}).then(function(res) {
                    return (filesCache[layoutUrl] = res);
                });
            },
            getJson: function(script_url) {
                return $http.get(script_url, {
                    withCredentials: false,
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': undefined,
                        'Token': undefined
                    }
                }).then(function(res) {
                    return res.data;
                });
            },
            loadSnapshot: function(snapshot) {
                var self = this,
                    $snapshotImage = undefined;

                return $q(function(resolve, reject) {
                    $snapshotImage = $('.viewport .snapshot-image');
                    $snapshotImage[0].onload = function() {
                        resolve({
                            w: $snapshotImage.width(),
                            h: $snapshotImage.height()
                        });
                    };
                    $snapshotImage[0].onerror = function(e) {
                        //图片加载错误时不报错
                        resolve();
                    };
                    $snapshotImage.attr("src", snapshot.showGesture ? snapshot.url : self.getSnapshotOriginUrl(snapshot));
                });
            },
            reConfigScriptJson: function(snapshots, script_json, isSpreadBase64Code) {
                // 1.因为base64 code很长,在脚本不显示,保存的时候还是要传给后端,在前端显示为:"base64-code..."
                // 2.把小图的坐标信息存到脚本保存到后端,展示的脚本时删除该属性
                _.each(script_json.actions, function(action) {
                    var snapshot;
                    if (action.hasOwnProperty("clickImage")) {
                        snapshot = _.find(snapshots, {key: action.actionId});
                        if (!snapshot) return;

                        if (isSpreadBase64Code) {
                            action.clickImage = snapshot.clickImage;
                            action.amendValidClickRect = snapshot.amendValidClickRect;
                        } else {
                            snapshot.amendValidClickRect = action.amendValidClickRect;
                            snapshot.clickImage = action.clickImage;
                            delete action.amendValidClickRect;
                            action.clickImage = "base64-code...";
                        }
                    }
                    if (action.hasOwnProperty("measureImage")) {
                        snapshot = _.find(snapshots, {key: action.actionId});
                        if (!snapshot) return;

                        if (isSpreadBase64Code) {
                            action.measureImage = snapshot.measureImage;
                            action.measureRect = snapshot.measureRect;
                        } else {
                            snapshot.measureRect = action.measureRect;
                            snapshot.measureImage = action.measureImage;
                            delete action.measureRect;
                            action.measureImage = "base64-code...";
                        }
                    }
                })
            },
            // 根据script_json,生成snapshots
            createSnapshotsByScriptJson: function(testcase) {
                if (!testcase.script_json) return;

                var snapshots = [],
                    actions = testcase.script_json.actions || (testcase.script_json.actions = []),
                    url_prefix = testcase.url_prefix,
                    obj = {},
                    params,
                    actionId;

                _.each(actions, function(action) {
                    obj = {};
                    // 带有resourceId的action,jpg和xml使用resourceId,anchor使用actionId
                    actionId = action.resourceId || action.actionId;
                    if (_.indexOf(TESTCASE_ENUM.snapshotActions, action.action) > -1) {
                        obj = {
                            key: action.actionId,
                            resourceId: action.resourceId,
                            clickMode: action.clickMode,
                            url: url_prefix.image_host + actionId + ".jpg",
                            layoutUrl: url_prefix.layout_host + actionId + ".xml",
                            miniLayoutUrl: url_prefix.anchor_host + action.actionId + ".anchor"
                        };
                        if (action.ignoreAction) {
                            obj.ignoreAction = true;
                        }
                        snapshots.push(obj);
                    } else if (action.hasOwnProperty("componentName")) {
                        // 模块第一张截图key放在component_values[x].first_snapshot[x]
                        var baseName = action.componentName.split("#")[0],
                            first_snapshot = _.find(testcase.component_values, function(value) {
                                return value.first_snapshot && value.first_snapshot.hasOwnProperty(baseName);
                            }),
                            key = first_snapshot ? first_snapshot.first_snapshot[baseName] : "";
                        obj = {
                            componentName: action.componentName,
                            key: action.componentName,
                            url: url_prefix.image_host + key + ".jpg"
                        };
                        // 从后端获取first_snapshot,先把"first_snapshot"字段放action,用完之后删除
                        action.first_snapshot = key;
                        snapshots.push(obj);
                    }
                });

                _.each(snapshots, function(snapshot) {
                    _.each(actions, function(action) {
                        if (snapshot.key == action.actionId) {
                            obj = {};
                            if (_.indexOf(["plugin-dev", "plugin-tc"], action.action) > -1) {
                                params = action.params[0] || "";
                                obj = {
                                    pluginName: action.name,
                                    phase: action.phase,
                                    name: params.name || "",
                                    path: params.value.split(" ")[0],
                                    originTextValue: params.value.split(" ")[1]
                                };
                                if (params.name) {
                                    obj.setText = [params.value.split(" ")[1]];
                                }
                                snapshot.plugins = snapshot.plugins || [];
                                snapshot.plugins.push(obj);
                            } else if (action.action == "setText") {
                                params = action.params[0] || "";
                                snapshot.name = params.name;
                                snapshot.originTextValue = params.value;
                                if (params.name) {
                                    obj = {
                                        name: params.name,
                                        expectValue: params.value,
                                        setText: [params.value]
                                    };
                                    snapshot.plugins = snapshot.plugins || [];
                                    snapshot.plugins.push(obj);
                                }
                            } else if (action.action == "initVariable" || action.action == "updateVariable" || action.action == "imageVariable") {
                                obj = {
                                    action: action.action,
                                    name: action.variableName,
                                    expectValue: action.expect,
                                    expect: [action.expect],
                                    checkVariable: action.checkVariable,
                                    index: action.index,
                                    position: action.position,
                                    regExp: action.variableRegex
                                };
                                snapshot.ocrAreas = snapshot.ocrAreas || [];
                                snapshot.ocrAreas.push(obj);
                            }
                        }
                    })
                });
                testcase.snapshots = snapshots;
            },
            // 根据action,生成snapshot
            createSnapshotByAction: function(testcase, action) {
                var url_prefix = testcase.url_prefix,
                    snapshot = {},
                    params,
                    obj,
                    actionId = action.resourceId || action.actionId;// 带有resourceId的action,jpg和xml使用resourceId,anchor使用actionId

                if (_.indexOf(TESTCASE_ENUM.snapshotActions, action.action) > -1) {
                    snapshot = {
                        key: action.actionId,
                        resourceId: action.resourceId,
                        clickMode: action.clickMode,
                        url: url_prefix.image_host + actionId + ".jpg",
                        layoutUrl: url_prefix.layout_host + action.resourceId + ".xml",
                        miniLayoutUrl: url_prefix.anchor_host + action.actionId + ".anchor"
                    };
                    if (action.ignoreAction) {
                        snapshot.ignoreAction = true;
                    }
                } else if (action.hasOwnProperty("componentName")) {
                    snapshot = {
                        componentName: action.componentName,
                        key: action.componentName,
                        url: url_prefix.image_host + action.first_snapshot + ".jpg"
                    };
                    // 添加模块时,先把"first_snapshot"字段放action,用完之后删除
                    delete action.first_snapshot;
                }

                if (_.indexOf(["plugin-dev", "plugin-tc"], action.action) > -1) {
                    params = action.params[0] || "";
                    obj = {
                        pluginName: action.name,
                        phase: action.phase,
                        name: params.name || "",
                        path: params.value.split(" ")[0],
                        originTextValue: params.value.split(" ")[1]
                    };
                    if (params.name) {
                        obj.setText = [params.value.split(" ")[1]];
                    }
                    snapshot.plugins = snapshot.plugins || [];
                    snapshot.plugins.push(obj);
                } else if (action.action == "setText") {
                    params = action.params[0] || "";
                    snapshot.name = params.name;
                    snapshot.originTextValue = params.value;
                    if (params.name) {
                        obj = {
                            name: params.name,
                            expectValue: params.value,
                            setText: [params.value]
                        };
                        snapshot.plugins = snapshot.plugins || [];
                        snapshot.plugins.push(obj);
                    }
                } else if (action.action == "initVariable" || action.action == "updateVariable") {
                    obj = {
                        action: action.action,
                        name: action.variableName,
                        expectValue: action.expect,
                        expect: [action.expect],
                        checkVariable: action.checkVariable,
                        index: action.index,
                        position: action.position,
                        regExp: action.variableRegex
                    };
                    snapshot.ocrAreas = snapshot.ocrAreas || [];
                    snapshot.ocrAreas.push(obj);
                }
                return snapshot;
            },
            batchSaveSnapshots: function(testcase, ignoreSpinner) {
                testcase.script_json.formulas && testcase.script_json.formulas.length == 0 && (testcase.script_json.formulas = undefined);
                return $http.post("/api/testcase/" + testcase.id + "/snapshot/batch/", {
                    script_json: testcase.script_json
                }, { ignoreSpinner: ignoreSpinner });
            },
            isSnapshotEdited: function(snapshot) {

                return _includeParameter(snapshot) || _includePlugin(snapshot);

                function _includeParameter(snapshot) {
                    return (snapshot.ocrAreas && snapshot.ocrAreas.length) || _.find(snapshot.plugins || [], function(plugin) {
                        return plugin.hasOwnProperty('setText');
                    });
                }

                function _includePlugin(snapshot) {
                    return !_.isEmpty(snapshot.plugins);
                }
            },
            updateTestCaseSubmitStatus: function(testcase) {
                return $http.post("/api/testcase/" + testcase.id + "/", {"is_submitted": testcase.is_submitted});
            },
            refreshSnapshots: function(id, scriptKey, batchVersion) {
                return $http.post("/api/testcase/" + id + "/snapshot/sync/", {script_key: scriptKey, batch_version: batchVersion});
            },
            getParamAction: function(params) {
                return $http.post("/api/testcase/gen/action/", params).then(function(res) {
                    return res.data;
                }).catch(function () {
                    DialogService.alert("未识别到该选择控件！").then(function() {
                        setTimeout(function () {
                            $('.icon-popup-close').trigger('click')
                        },0)
                    })
                })
            },
            alert: function(element, msg) {
                if (TESTCASE_VALIDATE_VALUE.isNeedAlertValidate && !TESTCASE_VALIDATE_VALUE.hasAlertValidate) {
                    TESTCASE_VALIDATE_VALUE.hasAlertValidate = true;

                    DialogService.alert(msg).finally(function() {
                        TESTCASE_VALIDATE_VALUE.hasAlertValidate = false;
                        element.focus();
                    })
                }
                TESTCASE_VALIDATE_VALUE.isNeedAlertValidate = true;
            },
            getXPathBounds: function(params) {
                return $http.post("/api/testcase/find/bounds/", params).then(function(res) {
                    return res.data;
                });
            },
            getActionScript: function(apiPath,action) {
                return $http.post("/api/xpath/" + apiPath + "/", action, {ignoreErrAlert: true}).then(function(res) {
                    return res.data;
                });
            },
            setTagsForTestCases: function(key, params) {
                return $http.post("/api/testcase/app/" + key + "/tags/batch/", params).then(function(res) {
                    return res.data;
                });
            }
        }
    }

    function RegexpsTemplateService($http, $q) {
        var addedRegexps = [],
            appKey;

        return {
            getRegexps: getRegexps,
            addRegexp: addRegexp,
            deleteRegexp: deleteRegexp
        };

        function getRegexps(key) {
            //暂时处理每次打开均清空缓冲
            appKey = key;
            return $http.get("/api/app/" + appKey + "/regExps/").then(function(res) {
                return res.data;
            })
        }

        function addRegexp(regexp) {
            return $http.post("/api/app/" + appKey + "/regExps/", regexp).then(function(res) {
                return res.data;
            })
        }

        function deleteRegexp(id) {
            return $http.delete("/api/app/regExp/" + id + "/")
        }
    }

    function TagService($http) {
        return {
            getTags: function(appKey) {
                return $http.get("/api/testcase/app/" + appKey + "/tag/").then(function(res) {
                    return res.data;
                })
            },
            saveTag: function(appKey, params) {
                return $http.post("/api/testcase/app/" + appKey + "/tag/", params).then(function(res) {
                    return res.data;
                })
            },
            updateTag: function(appKey, params) {
                return $http.post("/api/testcase/app/" + appKey + "/tag/action/", params)
            },
            deleteTag: function(appKey, params) {
                return $http.delete("/api/testcase/app/" + appKey + "/tag/action/", {data: params});
            }
        }
    }
})();

(function() {

    angular.module('quail.task')
        .factory("TaskService", TaskService)
        .factory("ExecutionService", ExecutionService)
        .factory("TaskFiltersService", TaskFiltersService);


    function TaskService($http, $q, $uibModal, $timeout, TASK_ENUM, config, spinner, DataService, TestCaseService, TaskFiltersService, DialogService) {

        var clickedIds = {},
        filtersTemplate = {
            status: {
                data: {
                    all: {
                        text: "全部",
                        value: "all"
                    },
                    pending: {
                        text: "执行中",
                        value: 0
                    },
                    complete: {
                        text: "完成",
                        value: 10
                    }
                }
            }
        }

        function _balanceNotEnough(rejection, originErrorHandler) {
            if (rejection.status == 410) {
                $uibModal.open({
                    templateUrl: 'components/rent-modal/rent.confirm.modal.html',
                    controller: "BalanceNotEnoughCtrl",
                    size: 'md',
                    resolve: {
                        result: rejection
                    }
                });
                return $q.reject(rejection);
            } else {
                return originErrorHandler(rejection);
            }
        }

        return {
            getFilters: function() {
                return _.cloneDeep(filtersTemplate);
            },
            getTasks: function(appId, type, pageNum, testcases, replayModes, isTimedTask, searches, sub_replay_type) {
                //判断testcases的数量，如果太多，url会超出长度限制
                if (testcases && testcases.join(',').length > 31799) {
                    return DialogService.alert('选择用例过多，请适量筛选用例');
                }
                return $http.get(isTimedTask ? "/api/task/app/" + appId + "/scheduled_task/" : "/api/task/app/" + appId + "/task/v3/", {
                    params: {
                        type: type,
                        page: pageNum,
                        testcase_ids: testcases ? testcases.join(',') : testcases,
                        replay_modes: replayModes ? replayModes.join(',') : undefined,
                        searches: searches,
                        sub_replay_type: sub_replay_type
                    }
                }).then(function(res) {
                    return res.data;
                });
            },
            getTask: function(taskId) {
                return $http.get('/api/task/' + taskId + '/').then(function(res) {
                    return res.data;
                });
            },
            deleteTask: function(taskId) {
                return this.getReportByTask(taskId).then(function() {
                    return DialogService.confirm("删除任务会把对应的报告删除,确定删除吗?")
                }).then(function() {
                    return $http.delete('/api/task/' + taskId + '/execution/', {});
                });
            },
            deleteTasks: function(taskIds) {
                return $http.delete('/api/task/action/', {data: {keys: taskIds}});
            },
            getReportByTask: function(taskId) {
                return $http.get("/api/task/" + taskId + "/report/").then(function(res) {
                    return res.data;
                });
            },
            createTask: function(id, task) {
                return $http.post("/api/task/release/" + id + "/task/", {
                    name: task.name,
                    desc: task.desc,
                    type: task.type,
                    duration: task.duration,
                    device_key: task.device_key
                }, {responseError: _balanceNotEnough}).then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'task-create',
                        eventLabel: task.name
                    });
                    return res.data;
                });
            },
            createEmptyTask: function(id, task) {
                return $http.post("/api/task/release/" + id + "/empty_task/", task).then(function(res) {
                    return res.data.id;
                });
            },
            createReplayTask: function(id, task) {
                return $http.post("/api/task/release/" + id + "/replay_task/v2/", {
                    name: task.name,
                    desc: task.desc,
                    schedule_mode: task.schedule_mode,
                    replay_mode: task.replay_mode,
                    devices: task.device,
                    testcase_ids: _.map(task.testcases, "id"),
                }).then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'replay-task-create',
                        eventLabel: task.name
                    });
                    return res.data;
                });
            },
            createReplayTaskV3: function(id, task) {
                // schedule_time为定时发起任务时间,schedule_time存在表示发起定时任务,否则未普通任务
                var params = {
                    name: task.name,
                    desc: task.desc,
                    schedule_mode: task.schedule_mode,
                    replay_mode: task.is_monkey ? 3 : task.replay_mode,
                    schedule_time: task.scheduleTime,
                    devices: _.map(task.device, "key"),
                    testcase_ids: _.map(task.testcases, "id"),
                    priority: task.priority,
                    repeat_times: +task.repeatTimes,
                    clear_mode: +task.clearMode,
                    config_url: task.configUrl,
                    end_time: task.endTime,
                    dead_line: task.deadLine,
                    period: +task.periodValue,
                    is_override: task.is_override,
                    monkey_steps: task.is_monkey ? task.monkey_steps : null,
                    mail_group: task.isSendmail == 1 ? task.mail_group : null,
                    save_video: task.save_video == 1 ? true : false,
                    sub_replay_type: task.sub_replay_type ? 1 : 0,
                    send_report: task.send_report == 1 ? true : false,
                    which_days: task.which_days
                };
                task.scheduleTime && _.extend(params, {retest_times: +task.retest_times, retest_type: +task.retest_type});
                task.which_time_start && _.extend(params, {which_time_start: task.which_time_start});
                task.which_time_stop && _.extend(params, {which_time_stop: task.which_time_stop});

                return $http.post(task.scheduleTime ? "/api/task/release/" + id + "/scheduled_task/" : "/api/task/release/" + id + "/replay_task/v2/", params)
                    .then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'replay-task-create',
                        eventLabel: task.name
                    });
                    return res.data;
                });
            },
            addToReplayTask: function(task, id) {
                return $http.post("/api/task/" + id + "/execution/add/", {
                    devices: task.device,
                    config_url: task.config_url
                }).then(function(res) {
                    return res.data;
                });
            },
            downloadResult: function(task) {
                return $http.get("/api/task/" + task.id + "/result/download/").then(function(res) {
                    return DataService.downloadByUrl(res.data.url);
                });
            },
            getExecutionResult: function(executionId, editMode) {
                return $http.get("/api/task/execution/" + executionId + "/result_edit_list/", {params: {edit_mode: editMode}}).then(function(res) {
                    return res.data;
                })
            },
            updateExecutionResult: function(taskId, params) {
                return $http.post("/api/task/" + taskId + "/execution/result_edit/batch/", params).then(function(res) {
                    return res.data;
                })
            },

            cancelExecutions: function(taskId, params) {
                return $http.post("/api/task/" + taskId + "/execution/stop/", params).then(function(res) {
                    return res.data;
                })
            },
            deleteSnapshot: function(executionId, snapshotKey) {
                return $http.delete("/api/task/execution/" + executionId + "/snapshot/" + snapshotKey + "/");
            },
            getExecutionSnapshots: function(executionId) {
                return $http.get("/api/task/execution/" + executionId + "/snapshot/").then(function(res) {
                    return res.data;
                })
            },
            sendReplayExections: function(task, url, rentKey, executions) {
                return $http.post(url + '/app/api/playback?jwt=' + task.rio_token, {
                    deviceKey: executions[0].device.key,
                    rentKey: rentKey,
                    executions: {
                        mainActivity: task.replay_rules.mainActivity,
                        apkKey: task.replay_rules.apkKey,
                        pkgName: task.replay_rules.pkgName,
                        version: task.replay_rules.version,
                        executions: executions
                    }
                }, {
                    ignoreErrHandler: true
                });
            },
            getCustomerDuration: function() {
                return $http.get("/api/customer/duration/").then(function(res) {
                    return res.data;
                });
            },
            reletTask: function(task, config) {
                return $http.post("/api/task/" + task.id + "/extend/", {duration: TASK_ENUM.defaultDuration}, config || {}).then(function(res) {
                    return res.data;
                });
            },
            reletDistributeTask: function(execution, config) {
                return $http.post("/api/task/execution/" + execution.id + "/extend/", {duration: TASK_ENUM.defaultDuration}, config || {}).then(function(res) {
                    return res.data;
                });
            },
            reviseTask: function(task) {
                return $http.post("/api/task/" + task.id + "/revise/", {
                    duration: TASK_ENUM.defaultDuration,
                    device_key: task.device_key
                }).then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'task-continue',
                        eventLabel: task.name
                    });
                    return res.data;
                });
            },
            completeTask: function(taskId, params) {
                return $http.post("/api/task/" + taskId + "/complete/", params);
            },
            abortTask: function(taskId, executionKeys) {
                executionKeys = (!executionKeys || _.isEmpty(executionKeys)) ? undefined : executionKeys;
                //window.onunload回调中，异步ajax请求无法保证到达，故使用jquery发送同步ajax请求（angular的$q不支持同步模式）
                return $.ajax({
                    type: "POST",
                    async: false,
                    headers: {
                        'Authorization': 'Token ' + config.token
                    },
                    url: "/api/task/" + taskId + "/complete/",
                    //http://stackoverflow.com/questions/11109795/how-do-i-post-an-array-of-objects-with-ajax-jquery-or-zepto
                    //How to post array params to backend with jQuery post method in data
                    contentType: "application/json",
                    data: JSON.stringify({
                        abort: true,
                        abort_executions: executionKeys
                    })
                });
            },
            getExecutions: function(taskId) {
                return $http.get("/api/task/" + taskId + "/execution/").then(function(res) {
                    return (executions = res.data);
                });
            },
            createExecution: function(taskId, testcase) {
                //创建测试执行时，有可能对应的用例被删除,添加ignoreErrHandler来跳过默认的错误处理
                var data = testcase ? {testcase_id: testcase.id} : {};
                return $http.post("/api/task/" + taskId + "/execution/", data, {ignoreErrHandler: true}).then(function(res) {
                    return res.data;
                });
            },
            completeExecution: function(execution, isRecord) {
                return isRecord ? this.completeRecordExecution(execution) : this.completeManualExecution(execution);
            },
            completeRecordExecution: function(execution) {
                // remember last testcase in order to select it by default after finishing script recording.
                this.lastRecordTestCaseId = execution.testcase.id;
                var model = _.clone(execution);
                model.snapshots = [];
                delete model.testcase;
                angular.forEach(execution.snapshots, function(item) {
                    model.snapshots.push({
                        key: item.body.name,
                        ignore: item.ignore,
                        areasType: item.areasType,
                        areas: item.areas
                    });
                });
                model.snapshots = _.sortBy(model.snapshots, 'key');
                return $http.post("/api/task/execution/" + execution.id + "/complete/recording/", model);
            },
            // 用例录制不再调用completeRecordExecution、completeTask、abortTask;也不不用通知tc,由Django新接口completeRecord或abortRecord完成
            completeRecord: function(taskId, executionId, action) {
                return $http.post("/api/task/" + taskId + "/complete/v2/", {action: action, execution_id: executionId});
            },
            ajaxSyncCompleteRecord: function(taskId, executionId, action) {
                //window.onunload回调中，异步ajax请求无法保证到达，故使用jquery发送同步ajax请求（angular的$q不支持同步模式）
                return $.ajax({
                    type: "POST",
                    async: false,
                    headers: {
                        'Authorization': 'Token ' + config.token
                    },
                    url: "/api/task/" + taskId + "/complete/v2/",
                    //http://stackoverflow.com/questions/11109795/how-do-i-post-an-array-of-objects-with-ajax-jquery-or-zepto
                    //How to post array params to backend with jQuery post method in data
                    contentType: "application/json",
                    data: JSON.stringify({
                        action: action,
                        execution_id: executionId
                    })
                });
            },
            ajaxSyncAbortRecord: function(taskId, executionId) {
                //window.onunload回调中，异步ajax请求无法保证到达，故使用jquery发送同步ajax请求（angular的$q不支持同步模式）
                return $.ajax({
                    type: "POST",
                    async: false,
                    headers: {
                        'Authorization': 'Token ' + config.token
                    },
                    url: "/api/task/" + taskId + "/complete/v2/",
                    //http://stackoverflow.com/questions/11109795/how-do-i-post-an-array-of-objects-with-ajax-jquery-or-zepto
                    //How to post array params to backend with jQuery post method in data
                    contentType: "application/json",
                    data: JSON.stringify({
                        action: "abort",
                        execution_id: executionId
                    })
                });
            },
            getLastRecordTestCaseId: function() {
                var res = this.lastRecordTestCaseId;
                this.lastRecordTestCaseId = null;
                return res;
            },
            completeManualExecution: function(execution) {
                var model = _.clone(execution);
                model.snapshots = [];
                angular.forEach(execution.snapshots, function(item) {
                    model.snapshots.push({
                        key: item.body.name
                    });
                });
                model.snapshots = _.sortBy(model.snapshots, 'key');
                return $q(function(resolve, reject) {
                    $http.post("/api/task/execution/" + execution.id + "/complete/", model).then(function(){
                        spinner.show();
                        _get(execution);
                        function _get(execution) {
                            $http.get("/api/task/execution/" + execution.id + "/status/",{}, {ignoreSpinner:true}).then(function(res) {
                                var result = res.data;
                                if (result.completed) {
                                    if (result.success) {
                                        spinner.hide();
                                        resolve(result);
                                    }else{
                                        reject();
                                    }
                                } else {
                                    $timeout(function() {
                                        _get(execution);
                                    }, 3000);
                                }
                            })
                        }
                    })
                })
            },
            deleteExecution: function(execution) {
                return $http.delete("/api/task/execution/" + execution.hashkey + "/", {data: {}});
            },
            saveSnapshotPatch: function(execution, key, originKey) {
                return $http({
                    method: 'PATCH',
                    url: '/api/task/execution/' + execution.id + '/snapshot/',
                    data: {
                        key: key,
                        origin_snapshot_key: originKey
                    }
                });
            },
            deleteSnapshotPatch: function(execution, snapshot) {
                return $http.delete("/api/task/execution/" + execution.id + "/snapshot/" + snapshot.patch.key + "/", {data: {}});
            },
            getTaskExecutions: function(appId, taskIds, excludeLinkedExecution) {
                return $http.get("/api/task/app/" + appId + "/execution/", {
                    params: {
                        task_ids: taskIds,
                        exclude_linked_execution: excludeLinkedExecution || false
                    }
                }).then(function(res) {
                    return res.data;
                });
            },
            getTaskTestcases: function(task) {
                return $http.get("/api/task/" + task.id + "/testcase/").then(function(res) {
                    return res.data;
                });
            },
            getDeviceList: function(params) {
                return $http.get("/api/task/device_list", {params: params}).then(function(res) {
                    return res.data;
                });
            },
            openFilterTasksWindow: function(options) {
                return $uibModal.open({
                    template: '<div class="rent-modal rio-modal"><div ng-include="\'components/rent-modal/testcase.step.html\'"></div></div>',
                    controller: "FilterTasksCtrl as testcaseVm",
                    size: 'lg',
                    resolve: {
                        testcases: function() {
                            return TestCaseService.getTestCases(options.app.key, options.hasScript);
                        },
                        filterTestCases: function() {
                            return options.filterTestCases;
                        }
                    }
                }).result;
            },
            replayComptestTask: function(taskId, executions, release) {
                return $http.post("/api/task/" + taskId + "/execution/retest/", {executions: _.map(executions, 'key'), app_release_id: release && release.id});
            },
            replayTaskByFile: function(taskId, devises, release) {
                return $http.post("/api/task/" + taskId + "/execution/retest/", {device_keys_dict: devises, app_release_id: release.id});
            },
            replayTaskWithParams: function(taskId, executions, configUrl, release) {
                return $http.post("/api/task/" + taskId + "/execution/retest/", {executions: _.map(executions, 'key'), config_url: configUrl, app_release_id: release.id});
            },
            startDistributeTask: function(id, params) {
                return $http.post("/api/task/execution/" + id + "/start/", params).then(function(res) {
                    return res.data;
                })
            },
            getWaitAppQueue: function(executionId) {
                return $http.get("/api/task/execution/" + executionId + "/queue2/").then(function(res) {
                    return res.data;
                })
            },
            uploadParamfile: function(url, file) {
                return $http.put(url, file, {
                    withCredentials: false,
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': undefined,
                        'Token': undefined
                    }
                });
            },
            recordClickId: function (type, id) {
                id && (clickedIds[type] = id);
                return clickedIds[type];
            },
            readFile: function(files, callback) {
                if (files.length > 0) {
                    var file = files[0],
                        maxSize = 5 * 1024 * 1024;

                    var strArr = file.name.split(".");

                    if (strArr.length > 1 && strArr[strArr.length - 1] != "config" && strArr[strArr.length - 1] != "json") {
                        DialogService.alert("文件扩展名只能是config、json，或无扩展名！");
                        return
                    }

                    if (file.size > maxSize) {
                        DialogService.alert("文件大小不能超过5M!");
                        return
                    }

                    var reader = new FileReader();
                    reader.onload = (function(file) {
                        return function(e) {
                            try {
                                JSON.parse(this.result);
                            } catch (e) {
                                DialogService.alert("文件格式错误!");
                                return;
                            }
                            callback(file)
                        };
                    })(file);

                    //读取文件内容
                    reader.readAsText(file);
                }
            },
            getTestdetailExcel: function(taskId, executionIds) {
                return DataService.download('/api/task/' + taskId + '/execution_snapshots/export/excel/?execution_ids=' + executionIds.toString())
            },
            getTimedTasks: function(appId, type, pageNum, testcases, replayModes) {
                return $http.get("/api/task/app/" + appId + "/task/v3/", {
                    params: {
                        type: type,
                        page: pageNum,
                        testcase_ids: testcases ? testcases.join(',') : testcases,
                        replay_modes: replayModes ? replayModes.join(',') : undefined
                    }
                }).then(function(res) {
                    return res.data;
                });
            },
            updateTimedTasks: function(task) {
                return $http.post("/api/task/scheduled_task/" + task.scheduled_task_id + "/", task).then(function(res) {
                    return res.data;
                });
            },
            deleteTimedTask: function(task) {
                return this.getReportByTask(task.id).then(function() {
                    return DialogService.confirm("删除此定时任务会把对应的报告删除,确定删除吗?")
                }).then(function() {
                    return $http.delete('/api/task/scheduled_task/' + task.scheduled_task_id + '/', {});
                });
            },
            addProcedures: function(params, taskId) {
                return $http.post("/api/task/" + taskId + "/", params).then(function(res) {
                    return res.data;
                });
            },
            addProblem: function(params, executionId) {
                return $http.post("/api/task/execution/" + executionId + "/result_edit/exception/add/", params).then(function(res) {
                    return res.data;
                });
            },
            deleteProblem: function(params, executionId) {
                return $http.post('/api/task/execution/' + executionId + '/result_edit/exception/delete/', params);
            },
            getMails: function() {
                return $http.get("/api/customer/list/mail/group/").then(function(res) {
                    return res.data;
                });
            },
            exportExcel: function(taskId, execution_ids) {
                return $http.get('/api/task/'+ taskId + '/execution_snapshots/export/excel/', {params: {execution_ids: execution_ids}}).then(function(res) {
                    return res.data;
                });
            }
        };

    }

    function ExecutionService($http, $q, $filter, TaskFiltersService, TaskService, RENT_TYPE, TASK_ENUM) {

        var
            executions,
            filteredExecutions,
            checkedIds = [],
            filters = {},
            service = {
                progress: 0,
                isCompleted: false,  //表示当页子任务是否全部完成（判断标准是是否都可以查看报告）
                filters: "",
                createExecution: createExecution,
                hasSearches: hasSearches,
                setTagsArr: setTagsArr,
                getExecutions: getExecutions,
                getTaskExecutions: getTaskExecutions,
                getFilterExecution: getFilterExecution,
                readFile: readFile,
                refreshTable: refreshTable,
                clearFilters: clearFilters
            };

        return service;
        function hasSearches(searches) {
            if (!searches) return false;
            var sum = 0;
            _.forIn(searches, function() {
                sum += 1;
            });
            if (sum > 1) return true;
            var deviceSum = 0;
            _.forIn(searches.device, function() {
                deviceSum += 1;
            });
            if (deviceSum > 0) return true;
        }

        function setTagsArr(tags) {
            var tagsArr = [];
            _.forIn(tags, function(value, key) {
                if (key != 'rio' && key != 'quail.domestic' && key != 'quail.record' && key != 'quail.replay') {
                    tagsArr.push(value);
                }
            });
            return tagsArr;
        }
        function getExecutions(taskId, pageNum, size, searches, isUpdate) {
            if (isUpdate) {
                checkedIds = _.chain(executions.results).filter({checked: true}).map("id").value();
            }
            size = size < 50 || !size ? 50 : size;
            pageNum = pageNum || 1;
            //searches中有条件则不需要start和end
            var params = {
                searches: searches
            };
            if (!service.hasSearches(searches)) {
                params.start = size * (pageNum - 1);
                params.end =  size * pageNum;
            }
            return $http.get("/api/task/" + taskId + "/execution/v2/", { params: params }).then(function(res) {
                executions = res.data;
                if (isUpdate) {
                    _.each(executions.results, function(item) {
                        checkedIds.indexOf(item.id) > -1 && (item.checked = true);
                    });
                }
                _.each(executions.results, function(item) {
                    item.device.tagsArr = service.setTagsArr(item.device.tags);
                })
                // 通过merge方法把ExecutionService.filters和TaskFiltersService中的filters建立关系
                service.filters = _.merge(filters, TaskFiltersService.initPageFilters(executions));
                return executions;
            });
        }

        function getTaskExecutions(appId, taskIds, excludeLinkedExecution) {
            return $http.get("/api/task/app/" + appId + "/execution/", {
                params: {
                    task_ids: taskIds,
                    exclude_linked_execution: excludeLinkedExecution || false
                }
            }).then(function(res) {
                executions = res.data;
                service.filters = _.merge(filters, TaskFiltersService.initFilters(executions));
                return executions;
            });
        }

        function getFilterExecution() {
            filteredExecutions = _.clone(executions);
            filteredExecutions = _.filter(filteredExecutions, function (execution) {
                var res = true;
                _.forEach(filters, function (filter, key) {
                    //搜索框过滤单独处理
                    if (key == "keywords") {
                        return true;
                    }

                    //过滤器
                    if (!filter.selected || filter.selected == "all") {
                        return true;
                    } else {
                        var filterValue = filter.data[filter.selected].value;
                        res = filter.getValue(execution) == filterValue;

                        // start前端记录成排队中
                        if (key == "resultChooses" && filter.data[filter.selected].objKey === "status"
                            && (execution.status == TASK_ENUM.executionStatus.start || execution.status == TASK_ENUM.executionStatus.queue)) {
                            // start前端记录成排队中
                            res = filterValue == TASK_ENUM.executionStatus.queue
                        }
                    }
                    // 根据res是否退出forEach循环
                    return res;
                })
                return res;
            })

            //搜索框过滤
            if (filters.keywords) {
                filteredExecutions = $filter('filter')(filteredExecutions, filters.keywords);
            }
            return filteredExecutions;
        }

        function createExecution(taskId, testcase) {
            //创建测试执行时，有可能对应的用例被删除,添加ignoreErrHandler来跳过默认的错误处理
            var data = testcase ? { testcase_id: testcase.id } : {};
            return $http.post("/api/task/" + taskId + "/execution/", data, { ignoreErrHandler: true }).then(function (res) {
                return res.data;
            });
        }

        function readFile(file) {
            var reader = new FileReader(),
                deferred = $q.defer(),
                promise = deferred.promise;

            reader.onload = (function (file) {
                return function (e) {
                    try {
                        deferred.resolve(JSON.parse(this.result));
                    } catch (e) {
                        deferred.reject("文件格式错误!");
                    }
                };
            })(file);

            reader.readAsText(file);
            return promise;
        }

        function refreshTable(taskId, pageNum, size, searches, isUpdate) {
            return service.getExecutions(taskId, pageNum, size, searches, isUpdate).then(function (executions) {
                service.isCompleted = true;
                _.forEach(executions.results, function(item) {
                    if (!item.is_upload || item.status <= 10) {
                        service.isCompleted = false;
                        return false;
                    }
                });
                service.filters = _.merge(filters, TaskFiltersService.initFilters(executions, true, service.filters));
                return executions;
            });
        }

        function clearFilters() {
            filters = {};
        }
    }

    function TaskFiltersService(TASK_ENUM) {
        var
            text = {
                all: "全部",
                failed: "失败",
                passed: "通过",
                blocked: "阻塞",
                pending: "执行中",
                queue: "排队中"
            },
            filtersTemplate = {
                resultChooses: {
                    getValue: function (obj) {
                        return obj[this.data[this.selected].objKey]
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    },
                    isUpdate: true
                },
                toDoResults: {
                    getValue: function (obj) {
                        return obj.is_todo
                    },
                    data: {
                        all: {
                            text: "全部",
                            value: "all"
                        },
                        true: {
                            text: "待处理",
                            value: true
                        },
                        false: {
                            text: "已处理",
                            value: false
                        }
                    }
                },
                subtypeResults: {
                    getValue: function (obj) {
                        return obj.result_subtype_json && obj.result_subtype_json[0].info;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    },
                    isUpdate: true
                },
                scenario: {
                    getValue: function (obj) {
                        return obj.scenario;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    },
                    isUpdate: true
                },
                controllerShortName: {
                    getValue: function (obj) {
                        return obj.device.controller_short_name;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    },
                    isUpdate: true
                },
                name: {
                    getValue: function (obj) {
                        return obj.name;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    },
                    isUpdate: true
                },
                deviceName: {
                    getValue: function (obj) {
                        return obj.device.name;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    },
                    isUpdate: true
                },
                deviceStatus: {
                    getValue: function (obj) {
                        return obj.device.status;
                    },
                    data: {
                        all: {
                            text: "全部",
                            value: "all"
                        },
                        free: {
                            text: "空闲",
                            value: 0
                        },
                        busy: {
                            text: "忙碌",
                            value: 1
                        },
                        maintain: {
                            text: "维护中",
                            value: 3
                        },
                        replaying: {
                            text: "回放中",
                            value: 4
                        }
                    },
                    isUpdate: true
                },

            },
            filters,
            //详情分页使用的filter，条件选项固定，与当前页的数据无关，每次过滤需要查询接口
            pageFilters = {
                result_code: {
                    getValue: function (obj) {
                        return obj[this.data[this.selected].objKey]
                    },
                    data: {
                        all: {
                            text: "全部",
                            value: "all"
                        }
                    }
                },
                is_todo: {
                    getValue: function (obj) {
                        return obj.is_todo
                    },
                    data: {
                        all: {
                            text: "全部",
                            value: "all"
                        },
                        true: {
                            text: "待处理",
                            value: true
                        },
                        false: {
                            text: "已处理",
                            value: false
                        }
                    }
                },
                deviceStatus: {
                    getValue: function (obj) {
                        return obj.device.status;
                    },
                    data: {
                        all: {
                            text: "全部",
                            value: "all"
                        },
                        free: {
                            text: "空闲",
                            value: 0
                        },
                        busy: {
                            text: "忙碌",
                            value: 1
                        },
                        maintain: {
                            text: "维护中",
                            value: 3
                        },
                        replaying: {
                            text: "回放中",
                            value: 4
                        }
                    }
                }
            }
        return {
            initFilters: initFilters,
            initPageFilters: initPageFilters,
            getFilters: getFilters
        }

        function initFilters(executions, isUpdate, filters) {
            if (!isUpdate) filters = _.cloneDeep(filtersTemplate);
            _.forEach(filters, function (filter, key) {
                if (key == "resultChooses") {
                    //执行完成
                    _.each(TASK_ENUM.executionResult, function (value, key) {
                        _.find(executions, { 'result_code': value })
                            && (filter.data[key] = { objKey: "result_code", text: text[key], value: value });
                    })
                    //执行中
                    _.find(executions, { 'status': TASK_ENUM.executionStatus.pending })
                        && (filter.data.pending = { objKey: "status", text: "执行中", value: TASK_ENUM.executionStatus.pending });
                    //排队中 start前端处理成排队
                    _.find(executions, function (execution) {
                        return execution.status == TASK_ENUM.executionStatus.start || execution.status == TASK_ENUM.executionStatus.queue;
                    }) && (filter.data.queue = { objKey: "status", text: "排队", value: TASK_ENUM.executionStatus.queue });

                } else if (filter.isUpdate && key != "deviceStatus") {
                    _.each(executions, function (execution) {
                        var value = filter.getValue(execution)
                        if (value && !filter.data[value]) {
                            filter.data[value] = { text: value, value: value }
                        }
                    })
                }
            })
            return filters
        }

        function initPageFilters(executions) {
            filters = _.cloneDeep(pageFilters);
            //处理 结果 过滤选项
            _.forEach(filters, function (filter, key) {
                if (key == "result_code") {
                    //执行完成
                    _.each(TASK_ENUM.executionResult, function (value, key) {
                        _.find(executions.result_codes, function(result) {
                            if (result == value) {
                                filter.data[key] = { objKey: "result_code", text: text[key], value: value };
                            }
                        });
                    })
                    //执行中
                    _.find(executions.status_codes, function(status) {
                        return status == TASK_ENUM.executionStatus.pending;
                    }) && (filter.data.pending = { objKey: "status", text: "执行中", value: TASK_ENUM.executionStatus.pending });
                    //开始
                    _.find(executions.status_codes, function (status) {
                        if (status == TASK_ENUM.executionStatus.start) {
                            filter.data.start = { objKey: "status", text: "开始", value: TASK_ENUM.executionStatus.start };
                        }
                    });
                    //等待重测
                    _.find(executions.status_codes, function (status) {
                        return status == TASK_ENUM.executionStatus.waiting;
                    }) && (filter.data.waiting = { objKey: "status", text: "等待重测", value: TASK_ENUM.executionStatus.waiting });
                    //租用排队中
                    _.find(executions.status_codes, function (status) {
                        return status == TASK_ENUM.executionStatus.queue;
                    }) && (filter.data.queue = { objKey: "status", text: "排队", value: TASK_ENUM.executionStatus.queue });
                }
            })
            return filters;
        }

        function getFilters() {
            return filters
        }
    }

}());

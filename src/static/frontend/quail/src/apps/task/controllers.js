(function() {
    angular.module('quail.task')
        .controller('TasksCtrl', TasksController)
        .controller('TaskCtrl', TaskController)
        .controller('TaskChooseExecutionsCtrl', TaskChooseExecutionsController)
        .controller("BalanceNotEnoughCtrl", BalanceNotEnoughController)
        .controller("FilterTasksCtrl", FilterTasksController)
        .controller("WaitAppQueueController", WaitAppQueueController)
        .controller("RetestController", RetestController)
        .controller("PlayVideoController", PlayVideoController);

    // 自助功能测试
    function TasksController($scope, $state, $stateParams, TaskService, TaskFactoryService, RentModalService, Pagination, TASK_ENUM, DialogService) {
        $scope.createTask = TaskFactoryService.createTask;
        $scope.createTaskWidthDeviceKey = TaskFactoryService.createTaskWidthDeviceKey; // 内部测试,暂时弃用
        $scope.createEmptyTask = createEmptyTask;

        _activate();

        function _activate() {
            $scope.pagination = new Pagination(function(pageNum) {
                return TaskService.getTasks($stateParams.key, TASK_ENUM.taskType.manual, pageNum, TaskService.taskFilter);
            });
        }

        $scope.createReport = function() {
            var taskIds = _.chain($scope.pagination.data).filter({
                checked: true
            }).map("id").join(",").value();
            if (taskIds) {
                $state.go('app.task_choose_executions', {
                    ids: taskIds
                });
            }
        }

        $scope.reviseTask = function (task) {
            var duration = task.duration;
            RentModalService.open({
                    task: task,
                    app: $scope.app,
                    needChooseDevice: true,
                    needTestcase: true
                })
                .then(function() {
                    TaskService.reviseTask(task).then(function(data) {
                        data.remainTime = task.duration;
                        data.testcases = task.testcases;
                        $state.go("stf", {
                            task: data,
                            app: $scope.app,
                            appKey: $scope.app.key,
                            taskType: task.type
                        });
                    })
                })
                .then(null, function() {
                    task.duration = duration;
                })
        };

        $scope.deleteTask = function(task) {
            DialogService.confirm({
                    title: "提示",
                    message: "任务(" + task.name + ")包含" + task.execution_count + "条执行用例，删除后数据不可恢复，确认删除？",
                    sureText: "删除",
                    type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
                })
                .then(function() {
                    TaskService.deleteTask(task.id).then(function() {
                        $state.reload();
                    });
                });
        }

        $scope.filterTasks = function() {
            TaskService.openFilterTasksWindow({
                app: $scope.app,
                filterTestCases: TaskService.taskFilter
            }).then(function(testcases) {
                TaskService.taskFilter = testcases;
                $state.go($state.current, { clearFilter: false }, { reload: true });
            });
        }

        $scope.clickedId = TaskService.recordClickId($state.current.controller);
        $scope.recordClickId =  function recordClickId(clickedId) {
            $scope.clickedId = TaskService.recordClickId($state.current.controller, clickedId);
        }

        $scope.downloadResult = function(task) {
            return TaskService.downloadResult(task);
        }

        function createEmptyTask(app) {
            TaskFactoryService.createEmptyTask(app).finally(function() {
                $state.reload();
            });
        }
    }

    // 自助功能测试详情、自动回归测试详情、兼容性测试详情公用
    function TaskController($scope, $q, $stateParams, $state, $timeout, $uibModal, $controller, Pagination, UploadService, ModalService, replay, TaskService, DialogService, TaskFactoryService, ExecutionService, ExecutionDetailService, FileService, ReportService, EDIT_MODE, RETEST_TYPE, RENT_MODAL_STEP, TASK_ENUM) {

        var vm = this;

        vm.filters = {};
        vm.searches = {device: {}}; //过滤参数，请求分页查询接口时传入，每个过滤参数都是key:value格式
        vm.executions = [];
        vm.clickedId = TaskService.recordClickId($state.current.controller);
        vm.recordClickId =  recordClickId;
        vm.isNumber = _.isNumber;
        vm.isAutoRefresh = false;
        vm.isTimedTask = $state.current.name == "app.timedReplaytask" || $state.current.name == "app.timedComptesttask" || $state.current.name == "app.dialtesttask";// 定时任务
        vm.isAndroid = $scope.app.type == 'android';

        $scope.replay = replay;
        $scope.filteredExecutions = [];

        vm.isShowUpdateResultBtn = isShowUpdateResultBtn;
        vm.isIosNumBig = isIosNumBig;
        vm.stopExecutions = stopExecutions;
        vm.cancelExecutions = cancelExecutions;
        vm.updateComptestResult = updateComptestResult;
        vm.updateReplayResult = updateReplayResult;
        vm.showSnapshots = showSnapshots;
        vm.replayComptestTask = replayComptestTask;
        vm.playVideo = playVideo;
        vm.waitAppQueue = waitAppQueue;
        vm.chooseFilter = chooseFilter;
        vm.inputFilter = inputFilter;
        vm.deviceFilter = deviceFilter;
        vm.getFilterTable = getFilterTable;
        vm.retest = retest;
        vm.downloadKeyFile = downloadKeyFile;
        vm.replayTaskByFile = replayTaskByFile;
        vm.addToComptestTask = addToComptestTask;
        vm.replayTaskWithParams = replayTaskWithParams;
        vm.snapshotController = $controller("snapshotController");
        vm.getTestdetailExcel = getTestdetailExcel;
        vm.exportExcel = exportExcel;

        vm.fancybox = fancybox;
        vm.autoRefreshTable = autoRefreshTable;
        vm.goExecutionDetail = goExecutionDetail;
        vm.goDialtestExecutionDetail = goDialtestExecutionDetail;
        vm.goBack = goBack;

        $scope.showFailedDevices = showFailedDevices;
        $scope.deleteExecutions = deleteExecutions;
        $scope.rerunExecutions = rerunExecutions;

        var refreshTimer = null;

        _initPageData();
        function _initPageData() {
            $scope.pagination = new Pagination(function (pageNum, size, searches) {
                return ExecutionService.refreshTable($stateParams.taskId, pageNum, size, searches).then(function (res) {
                    vm.executions = res.results;
                    vm.totalLength = res.count;
                    vm.rioToken = res.rioToken;
                    _activate();
                    //判断是否有下一页
                    if (res.results.length + $scope.pagination.data.length < res.count) {
                        res.next = true;
                    } else {
                        res.next = false;
                    }
                    return res;
                });
            });
        }

        function _activate() {
            vm.isCompleted = ExecutionService.isCompleted;
            vm.filters = ExecutionService.filters;

            if (vm.isAutoRefresh && !refreshTimer && !vm.isCompleted) {
                refreshTimer = $timeout(function () {
                    refreshTimer = null;
                    _refreshTable();
                }, 10000)
            }
        }
        $scope.$on('$destroy', function () {
            vm.isAutoRefresh = false; // 查询详情,Django接口比较耗时.当请求还未返回时,离开当前界面后,Django返回结果前端还会继续执行then方法(timeout调用).所以离开界面时,通过变量来阻止timeout继续调用
            $timeout.cancel(refreshTimer);
            refreshTimer = null;
            ExecutionService.clearFilters();
        });

        //自主功能测试搜索功能
        $scope.$watch("vm.filters.keywords", function(newVal, oldVal) {
            if (newVal !== oldVal) {
                $scope.filteredExecutions = ExecutionService.getFilterExecution();
            }
        });

        function isIosNumBig(device) {
            if (vm.isAndroid) {
                return true;
            } else {
                return ExecutionDetailService.getIosNum(device.os) >= 11;
            }
        }

        function isShowUpdateResultBtn(){
return $scope.pagination.data.map(function(item){return item.result_code;}).filter(function(item){return item!=null;}).length ==  $scope.pagination.data.length        }

        function goExecutionDetail(execution) {
            if (execution.testcase_id === null) {
                DialogService.alert("用例已删除！");
            } else {
                window.open($state.href('executionDetail', {
                    hashkey: execution.hashkey,
                    canChangeCompare: true
                }), '_blank');
            }
        }

        function goDialtestExecutionDetail(execution) {
            if (execution.testcase_id === null) {
                DialogService.alert("用例已删除！");
            } else {
                window.open(execution.details_url);
            }
        }

        function getTestdetailExcel() {
            var checkeds = _.filter($scope.pagination.data, {checked: true});
            if (checkeds.length) {
                var promptTimer = $timeout(function() {
                    DialogService.alert("结果打包可能需要较长时间，您可以先进行其他操作！");
                }, 1000);
                TaskService.getTestdetailExcel($stateParams.taskId, _.map(checkeds, 'id')).then(function() {
                    $timeout.cancel(promptTimer);
                }, function() {
                    $timeout.cancel(promptTimer);
                });
            }
        }

        function exportExcel() {
            var execution_ids = _.chain($scope.pagination.data).filter({ checked: true}).map('id').value().join(',');
            return TaskService.exportExcel($stateParams.taskId, execution_ids).then(function(res) {
                FileService.downloadByUrl(res);
            });
        }

        function goBack(step) {
            if (history.length > 1) {
                history.go(step);
            } else {
                $state.go($state.current.name + 's', {}, {reload: true});
            }
        }

        function showFailedDevices() {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/replay.failed.devices.html',
                resolve: {
                    model: function() {
                        return replay;
                    }
                }
            });
        }

        function deleteExecutions() {
            var checkeds = _.filter($scope.pagination.data, {checked: true}),
                promise = $q.when(),
                msg = "确定删除此" + checkeds.length + "项用例？";

            if (checkeds.length == 0) return ;

            if ($scope.pagination.data.length == checkeds.length) {
                msg = "删除所有用例,任务会一并删除,确定删除吗";
                promise = TaskService.getReportByTask($stateParams.taskId).then(function(data) {
                    if (!_.isEmpty(data)) {
                        msg = "删除所有用例,任务和任务对应的报告会一并删除,确定删除吗";
                        return data;
                    }
                })
            }

            promise.then(function() {
                DialogService.confirm({
                        title: "提示",
                        message: msg,
                        sureText: "确定",
                        type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
                    })
                    .then(function() {
                        $q.all(_.map(checkeds, function(e) {
                            return TaskService.deleteExecution(e);
                        })).finally(function() {
                            vm.totalLength = vm.totalLength - checkeds.length;
                            _refreshTable();
                        });
                    });
            })

        }

        function rerunExecutions() {
            var checkeds = _.filter($scope.pagination.data, {checked: true});
            TaskFactoryService.rerunExecutions($scope.app, $scope.replay, checkeds);
        }

        // 兼容性测试、自动回归测试 重测按钮合成一个
        function retest(retestName) {
            var now_time = (new Date().getTime())/1000;
            if ($scope.replay.end_time && now_time > $scope.replay.end_time) {
                return DialogService.error('该任务已过截止时间，无法重测！');
            }
            ModalService.show({
                templateUrl: 'apps/task/templates/task.execution.retest.html',
                controller: 'RetestController',
                controllerAs: 'vm',
                resolve: {
                    filteredExecutions: function(){
                        return $scope.pagination.data;
                    },
                    retestName: function() {
                        return retestName;
                    }
                }
            }).then(function(model) {
                //让自动刷新生效
                vm.isCompleted = false;
                _refreshTable();
                var checkeds = _.filter($scope.pagination.data, {checked: true});
                if (model.type == RETEST_TYPE.batch) {
                    TaskService.replayComptestTask($stateParams.taskId, model.executions, model.release).then(function() {
                        _refreshTable();
                    });
                } else if (model.type == RETEST_TYPE.params) {
                    UploadService.upload(model.file, UploadService.getFileKey(model.file, "json")).then(function(url) {
                        return TaskService.replayTaskWithParams($stateParams.taskId, model.executions, url, model.release);
                    }).then(function() {
                        _refreshTable();
                    })
                } else if (model.type == RETEST_TYPE.file) {
                    TaskService.replayTaskByFile($stateParams.taskId, model.devices, model.release).then(function() {
                        _refreshTable();
                    });
                } else if (model.type == RETEST_TYPE.rerun) {
                    TaskFactoryService.rerunExecutions($scope.app, $scope.replay, checkeds);
                } else if (model.type == RETEST_TYPE.replay) { //回归测试直接再次回归重测，跳过选手机步骤，使用原有手机
                    var devices = _.chain($scope.pagination.data).filter({checked: true}).map("device").value();
                    TaskFactoryService.rerunExecutions($scope.app, $scope.replay, checkeds, RENT_MODAL_STEP.chooseTime, devices);
                }
            })
        }

        // 读取选择设备key,生成并下载json文件
        function downloadKeyFile() {
            var executions = _.filter($scope.pagination.data, {checked: true}),
                obj = {};
            _.each(executions, function(execution) {
                obj[execution.device.key] = execution.device.name;
            });
            FileService.downloadText(JSON.stringify(obj), "device_keys.json");
        }

        function replayTaskByFile($files) {
            if ($files.length > 0) {
                var file = $files[0];
                ExecutionService.readFile(file).then(function (res) {
                    TaskService.replayTaskByFile($stateParams.taskId, res).then(function () {
                        _refreshTable();
                    });
                }, function (res) {
                    DialogService.alert(res);
                })
            }
        }

        function getFilterTable() {
            ExecutionService.getExecutions($stateParams.taskId, 1, $scope.pagination.data.length, vm.searches, true).then(function (res) {
                $scope.pagination.data = res.results;
                $scope.pagination.index = 1;
                $scope.pagination.size = $scope.pagination.data.length;
                $scope.pagination.searches = vm.searches;
                if (ExecutionService.hasSearches(vm.searches)) {
                    $scope.pagination.next = false; //有过滤条件后显示全部，不需要下一页
                } else {
                    if (res.results.length < res.count) {
                        $scope.pagination.next = true;
                    }
                }
            });
        }

        function chooseFilter(choose, filterName) {
            vm.filters[filterName].selected = choose;
            if (filterName == 'deviceStatus') {
                deviceFilter(vm.filters[filterName].data[choose].value, 'status');
                return getFilterTable();
            }
            if (choose != 'all') {
                if (choose == 'failed' || choose == 'blocked' || choose == 'passed') {
                    vm.searches.result_code = vm.filters[filterName].data[choose].value;
                    delete vm.searches.status;
                } else if (choose == 'start' || choose == 'waiting' || choose == 'queue' || choose == 'pending' || choose == 'start') {
                    vm.searches.status = vm.filters[filterName].data[choose].value;
                    delete vm.searches.result_code;
                } else {
                    vm.searches[filterName] = vm.filters[filterName].data[choose].value;;
                }
            } else {
                delete vm.searches[filterName];
                delete vm.searches.status;
            }
            getFilterTable();
        }

        function inputFilter(value, key) {
            if (value) {
                vm.searches[key] = value;
            } else {
                delete vm.searches[key];
            }
        }
        //工控机，设备名称，设备状态这三个过滤条件统一放到vm.searches.device中，每个过滤参数也是key:value格式
        function deviceFilter(value, key) {
            if ((value || value === 0) && value != 'all') {
                vm.searches.device[key] = value;
            } else {
                delete vm.searches.device[key];
            }
        }

        function addToComptestTask(){
            TaskFactoryService.addToComptestTask($scope.app, $stateParams.taskId, vm.isTimedTask);
        }

        function replayTaskWithParams(files) {
            if (files.length == 0) return;

            var executions = _.filter($scope.pagination.data,  {checked:true}),
                uncompletedExecutions =  _.filter(executions, function(execution) {
                    return execution.status < 10;
                });
            if (uncompletedExecutions.length == 0) {
                TaskService.readFile(files, callback);
            } else {
                DialogService.alert("所选用例有" + uncompletedExecutions.length + "条未执行完成，不能发起重测！");
            }

            function callback(file) {
                DialogService.confirm({
                    title: "提示",
                    message: "确定重测选中的" + executions.length + "项用例？(实际重测数量由当前选中条目和参数文件共同确定)",
                    sureText: "确定",
                    type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
                }).then(function() {
                    UploadService.upload(file, UploadService.getFileKey(file, "json")).then(function(url) {
                        return TaskService.replayTaskWithParams($stateParams.taskId, executions, url);
                    }).then(function() {
                        _refreshTable();
                    })
                });
            }
        }

        function replayComptestTask(execution) {
            var now_time = (new Date().getTime())/1000;
            if ($scope.replay.end_time && now_time > $scope.replay.end_time) {
                return DialogService.error('该任务已过截止时间，无法重测！');
            }
            var executions = execution ? [execution] : _.filter($scope.pagination.data, {checked: true}),
                uncompletedExecutions =  _.filter(executions, function(execution) {
                    return execution.status < 10;
                });

            if (uncompletedExecutions.length == 0) {
                DialogService.confirm({
                    title: "提示",
                    message:  execution ? "确定重测此用例?" : "确定重测选中的" + executions.length + "项用例？",
                    sureText: "确定",
                    type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
                })
                .then(function () {
                    TaskService.replayComptestTask($stateParams.taskId, executions).then(function () {
                         _refreshTable();
                    });
                });
            } else {
                DialogService.alert("所选用例有" + uncompletedExecutions.length + "条未执行完成，不能发起重测！");
            }
        }

        function playVideo(execution) {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/play.video.modal.html',
                controller: 'PlayVideoController',
                size: 'lg',
                resolve: {
                    execution: function(){
                        return execution;
                    },
                    rioToken: function() {
                        return vm.rioToken;
                    },
                    task: function() {
                        return $scope.replay;
                    }
                }
            });
        }


        function cancelExecutions(execution) {
            var executions = execution ? [execution] : _.filter($scope.pagination.data, {checked: true}),
                msg = execution ? "确定取消此用例?" : "确定取消选中的" + executions.length + "项用例？";

            DialogService.confirm({
                title: "提示",
                message: msg,
                sureText: "确定",
                type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
            }).then( function() {
                  var params = {stop_execution_keys: execution ? [execution.key] : _.map(executions, "key")
                  };
                   return  TaskService.cancelExecutions($stateParams.taskId, params);
            }).then(function(){
                   return _refreshTable();
                 })
            }


        function stopExecutions(execution) {
            var executions = execution ? [execution] : _.filter($scope.pagination.data, {checked: true}),
                msg = execution ? "确定停止此用例?" : "确定停止选中的" + executions.length + "项用例？";

            DialogService.confirm({
                title: "提示",
                message: msg,
                sureText: "确定",
                type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
            }).then( function() {
                var params = {
                    stop_execution_keys: execution ? [execution.key] : _.map(executions, "key"),
                    keep_result : true
                  };
                  return  TaskService.cancelExecutions($stateParams.taskId, params);
            }).then(function(){
                  return _refreshTable();
               })
            }


        function updateComptestResult(execution) {
            var executions = execution ? [execution] : _.filter($scope.pagination.data, {checked: true});
            _updateResult(executions);
        }

        function updateReplayResult(is_multiple, execution) {
            var model;
            if (is_multiple) {
                model = {
                    is_multiple: is_multiple,
                    name: $scope.pagination.data[0].name,  //给个初始值，保证通过表单验证
                    result: TASK_ENUM.executionResult.passed,
                    severity: TASK_ENUM.executionSeverity.normal, //保证失败时严重程度有个初始值
                    desc: '',
                    updateBaseline: false,
                    isReplayTask: vm.isReplayTask,
                    isParametric: vm.isParametric
                };
            } else {
                model = {
                    is_multiple: is_multiple,
                    name: execution.name,
                    result: execution.result_code,
                    severity: execution.severity_code || TASK_ENUM.executionSeverity.normal, //保证失败时严重程度有个初始值
                    desc: execution.desc,
                    updateBaseline: false,
                    isReplayTask: vm.isReplayTask,
                    isParametric: vm.isParametric
                };
            }

            if (vm.isComptestReplayTask) {
                return;
            }

            ModalService.show({
                templateUrl: 'apps/report/execution-detail/templates/refresh.execution.result.html',
                model: model
            }).then(function(model) {
                if (model.result != TASK_ENUM.executionResult.failed) {
                    model.severity = null;
                }
                if (model.result != TASK_ENUM.executionResult.passed) {
                    model.updateBaseline = false;
                }
                if (model.over) {
                    if (model.is_multiple) {
                        model.execution_keys = _.chain($scope.pagination.data).filter({
                            checked: true
                        }).map("key").value();
                        ReportService.refreshExecutionsResult($scope.replay.id, model).then(function() {
                            _refreshTable();
                        });
                    } else {
                        ReportService.refreshExecutionResult(execution.hashkey, model).then(function() {
                            _refreshTable();
                        });
                    }
                }
            });
        }

        function _updateResult(executions) {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/result.update.html',
                controller: 'ExecutionResultUpdateCtrl',
                controllerAs: 'vm',
                size: 'large',
                resolve: {
                    result: function() {
                        // 1.单个查询executionResult时传对应execution.id;2.批量查询executionResult时传任一execution.id,这儿传第一个
                        return TaskService.getExecutionResult(executions[0].id, EDIT_MODE.list_result_mode);
                    },
                    executions: function() {
                        return executions;
                    },
                    model: function() {
                        return {
                            replayId: $stateParams.taskId,
                            editMode: EDIT_MODE.list_result_mode
                        }
                    }
                }
            }).then(function() {
                 _refreshTable();
            })
        }

        function showSnapshots(execution, isComptest) {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/execution.snapshots.html',
                controller: 'ExecutionSnapshotsCtrl',
                controllerAs: 'vm',
                windowClass: 'snapshot-modal-bigger',
                size: 'large',
                resolve: {
                    execution: function() {
                        return execution;
                    },
                    isComptest: function() {
                        return isComptest;
                    },
                    snapshots: function() {
                        return TaskService.getExecutionSnapshots(execution.id);
                    },
                    replayId: function() {
                        return $stateParams.taskId;
                    },
                    procedures: function() {
                        return TaskService.getTask($stateParams.taskId).then(function(res) {
                            return res.procedure;
                        });
                    },
                    problems: function() {
                        return TaskService.getExecutionResult(execution.id, EDIT_MODE.snapshot_result_mode).then(function(res) {
                            return res.result_subtype_json;
                        });
                    }
                }
            }).then(function() {
               _refreshTable();
            })
        }

        function waitAppQueue(id) {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/wait.app.queue.html',
                controllerAs: "vm",
                controller: "WaitAppQueueController",
                resolve: {
                    execution: function() {
                        return TaskService.getWaitAppQueue(id).then(function(data) {
                            return data;
                        });
                    },
                    executionId: function() {
                        return id;
                    }
                }
            })
        }

        function recordClickId(clickedId) {
            vm.clickedId = TaskService.recordClickId($state.current.controller, clickedId);
        }

        function autoRefreshTable() {
            vm.isAutoRefresh = !vm.isAutoRefresh;
            if (vm.isAutoRefresh) {
                _refreshTable()
            } else {
                $timeout.cancel(refreshTimer);
                refreshTimer = null;
            }
        }

        function _refreshTable() {
            ExecutionService.refreshTable($stateParams.taskId, 1, $scope.pagination.data.length, vm.searches, true).then(function(res) {
                $scope.pagination.data = res.results;
                $scope.pagination.index = 1;
                $scope.pagination.size = $scope.pagination.data.length;
                _activate();
            });
        }

        function fancybox(url) {
            url && $.fancybox(url);
        }
    }

    function TaskChooseExecutionsController($scope, $filter, $state, $stateParams, $controller, ExecutionService, ModalService, ReportService, executions,
        isReplay) {

        $scope.filters = ExecutionService.filters;
        $scope.allExecutions = executions;
        $scope.filteredExecutions = _.clone(executions);
        $scope.filteredExecutions.allChecked = true;

        $scope.snapshotController = $controller("snapshotController");

        $scope.$watch("keywords", function(newVal, oldVal) {
            if (newVal !== oldVal) {
                var filter = $filter('filter');
                $scope.filteredExecutions = filter($scope.allExecutions, $scope.keywords);
            }
        });

        $scope.report = {
            name: $scope.app.name + (isReplay ? "自动回归" : "自助功能") + "测试报告(" + $filter('date')(new Date(), 'yyyy-MM-dd') + ")",
            desc: "",
            executions: []
        };

        $scope.chooseFilter = function(choose, filterName) {
            $scope.filters[filterName].selected = choose;
            $scope.filteredExecutions = ExecutionService.getFilterExecution();
        };

        $scope.save = function() {
            $scope.report.executions = _.chain($scope.filteredExecutions).filter({
                checked: true
            }).map("id").value();
            if ($scope.report.executions.length) {
                ModalService.show({
                    templateUrl: "apps/report/templates/report.modal.html",
                    model: $scope.report
                }).then(function(model) {
                    ReportService.saveReport($stateParams.key, $scope.report).then(function() {
                        $state.go('^.reports', {
                            reload: true
                        });
                    })
                });
            }
        };

        $scope.keywords = "";
    }

    function BalanceNotEnoughController($scope, $uibModalInstance, result) {
        $scope.rechargeUrl = config.urls.dt + "/home/order";
        $scope.cancel = function() {
            $uibModalInstance.dismiss();
        };
        $scope.close = function() {
            $uibModalInstance.close();
        }

        $scope.submit = function($event) {
            if ($scope.recharged) {
                $event.preventDefault();
                $scope.close();
            } else {
                $scope.recharged = true;
            }
        }
    }

    function FilterTasksController($scope, $uibModalInstance, TaskService, testcases, filterTestCases, TESTCASE_ENUM, DialogService) {
        $scope.title = '请选择任务用例';
        $scope.getNextBtnText = getNextBtnText;

        var vm = this;
        vm.setting = {};
        vm.checkedCount = 0;
        vm.nodes = testcases;
        vm.isFilter = true; // indicate that this is for filtering task instead of creating task
        vm.cancel = cancel;
        vm.nextStep = nextStep;

        _initTree();


        function _initTree() {

            vm.nodes[0].open = true;
            angular.forEach(vm.nodes, function(node) {
                if (node.type == TESTCASE_ENUM.type.scenario) {
                    node.isParent = true;
                } else {
                    node.isParent = false;
                }
                if (_.includes(filterTestCases, node.id)) {
                    node.checked = true;
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
                    },
                    onCheck: function() {
                        $scope.$apply(function() {
                            _resetCheckedCount();
                        });
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

        function _resetCheckedCount() {
            vm.checkedCount = _.filter(_getTreeObj().getCheckedNodes(true), { isParent: false }).length;
        }

        function _getTreeObj() {
            return $.fn.zTree.getZTreeObj("testcase-tree");
        }

        function nextStep() {

            var selectedTestcases = _.chain(_getTreeObj().getCheckedNodes(true))
                .filter({ type: 0 })
                .map('id')
                .value();

            if (_.isEmpty(selectedTestcases)) {
                return DialogService.alert("您还没有选择用例！");
            }

            $uibModalInstance.close(selectedTestcases);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function getNextBtnText() {
            return '确定';
        }
    }

    function WaitAppQueueController($uibModalInstance, execution, executionId){
        var vm = this;

        vm.execution = execution;
        vm.executionId = executionId;

        vm.close = close;

        _init();

        function _init() {
            vm.waitIndex = 0;
            _.forEach(vm.execution.waiting_execs, function(wait, index) {
                if (vm.executionId == wait.id) {
                    vm.waitIndex = index;
                    return false;
                }
            });
        }

        function close() {
            $uibModalInstance.close();
        }
    }

    function RetestController($scope, $stateParams, $uibModalInstance, TaskService, ExecutionService, ReleaseService, filteredExecutions, retestName, RETEST_TYPE){
        var vm = this,
            devices,
            files,
            executions,
            uncompletedExecutions;

        vm.filteredExecutions = filteredExecutions;
        vm.releases = [];
        vm.retestType = RETEST_TYPE;
        if (retestName == 'comptest') {
            vm.retestTypes = [{label: "批量重测", type: RETEST_TYPE.batch}, {label: "带参重测", type: RETEST_TYPE.params}, {label: "读取文件重测", type: RETEST_TYPE.file}];
        } else if (retestName == 'replay') {
            vm.retestTypes = [{label: "带参重测", type: RETEST_TYPE.params},{label: "再次回归", type: RETEST_TYPE.rerun},  {label: "直接回归", type: RETEST_TYPE.replay}];
        }

        vm.checkedType = vm.retestTypes[0].type;
        vm.tips = "";

        vm.isReplay = isReplay;
        vm.chooseRelease = chooseRelease;
        vm.chooseType = chooseType;
        vm.selectedFileCallback = selectedFileCallback;
        vm.close = close;
        vm.cancel = cancel;

        _active();

        function _active() {
            ReleaseService.getReleases($stateParams.key).then(function(data){
                vm.releases = data;
                vm.release = vm.releases[0];
            }).then(function(){
                vm.chooseType(vm.checkedType);
            });
        }

        function isReplay() {
            return vm.checkedType != RETEST_TYPE.rerun && vm.checkedType != RETEST_TYPE.replay;
        }

        function chooseRelease(release) {
            vm.release = release;
        }

        function chooseType(type) {
            vm.checkedType = type;
            vm.tips = {};
            if (vm.checkedType == RETEST_TYPE.batch || vm.checkedType == RETEST_TYPE.rerun || vm.checkedType == RETEST_TYPE.replay) {
                executions = _.filter(vm.filteredExecutions, {checked: true});
                uncompletedExecutions = _.filter(executions, function(execution) {
                    return execution.status < 10;
                });

                if (uncompletedExecutions.length == 0) {
                    if (vm.checkedType == RETEST_TYPE.batch) {
                        vm.tips = {msg: "确定重测选中的" + executions.length + "项用例？", isValidate: true};
                    } else if (vm.checkedType == RETEST_TYPE.rerun) {
                        vm.tips = {msg: "确定再次回归选中的" + executions.length + "项用例？", isValidate: true};
                    } else if (vm.checkedType == RETEST_TYPE.replay) {
                        vm.tips = {msg: "确定在原有手机上直接回归选中的" + executions.length + "项用例？", isValidate: true};
                    }
                } else {
                    vm.tips = {msg: "所选用例有" + uncompletedExecutions.length + "条未执行完成，不能发起重测！", isValidate: false};
                }
            }
        }

        function selectedFileCallback(selectedfiles) {
            files = selectedfiles;
            if (files.length == 0) return;

            if (vm.checkedType == RETEST_TYPE.params) {
                executions = _.filter(vm.filteredExecutions, {checked: true});
                uncompletedExecutions = _.filter(executions, function(execution) {
                    return execution.status < 10;
                });
                if (uncompletedExecutions.length == 0) {
                    TaskService.readFile(files, callback);
                } else {
                    vm.tips = {msg: "所选用例有" + uncompletedExecutions.length + "条未执行完成，不能发起重测！", isValidate: false};
                }

                function callback() {
                    $scope.$apply(function() {
                        vm.tips = {msg: "选中" + executions.length + "项用例,(实际重测数量由当前选中条目和参数文件共同确定)", isValidate: true};
                    })
                }
            } else if (vm.checkedType == RETEST_TYPE.file) {
                ExecutionService.readFile(files[0]).then(function(res) {
                    devices = res;
                    vm.tips = {msg: files[0].name, isValidate: true};
                }, function(res) {
                    vm.tips = {msg: res, isValidate: false};
                })
            }
        }

        function close() {
            $uibModalInstance.close({type: vm.checkedType, file: files && files[0], devices: devices, executions: executions, release: vm.release});
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

    function PlayVideoController($scope, $sce, $timeout, $uibModalInstance, StfService, DialogService, execution, rioToken, task) {
        $scope.type = 'video'; //表示只放实时视频，不做操作，类似直播
        $scope.rioDevice = execution.device;
        $scope.rioDevice.serial = $scope.rioDevice.key;
        $scope.rioDevice.rentKey = $scope.rioDevice.rent_key;

        $scope.rioDevice.deviceType = /android/i.test($scope.rioDevice.os) ? 'android' : 'ios'
        $scope.task = task;
        $scope.task.type = 0; //不显示xml树
        $scope.device = null;
        $scope.isConnectDone = false;
        $scope.mode = '1'; // 1表示实时视频

        var client = $scope.client = StfService.createClient({
                scope: $scope,
                device: $scope.rioDevice,
                token: rioToken,
                beforeunload: function() {
                    return "是否结束播放？";
                }
            });

        window.client = client;

        client.watchs({
            //连接成功
            'connect.done': function (data) {
                $scope.isConnectDone = true;
                $scope.device = data.device;
                $scope.control = data.control;

                $scope.socket = client.getSocket();

                $scope.socket.on("device.stopVideo", function() {
                    DialogService.error('视频已播放完成').then(function() {
                        client.close();
                        $scope.socket.close();
                        $uibModalInstance.dismiss();
                    });
                });
            },
            //连接失败
            'connect.failed': function(reject) {
                DialogService.error(reject.msg).then(function() {
                    $uibModalInstance.dismiss();
                });
            }
        });
        $scope.cancel = function() {
            if ($scope.control) {
                $scope.control.stopVideo({
                    mode: '2', // 2表示视频监控
                    requirements: {
                        serial: {
                            value: $scope.rioDevice.serial,
                            match: 'exact'
                        }
                    }
                });
                client.close();
                $scope.socket.close();
            }
            $uibModalInstance.dismiss();
        };
    }
})();

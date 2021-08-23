(function() {
    angular.module('quail.task.replay')
        .controller('ReplaysCtrl', ReplaysController)
        .controller('ReplayStfCtrl', ReplayStfController)
        .controller('ExecutionResultUpdateCtrl', ExecutionResultUpdateController)
        .controller('ExecutionSnapshotsCtrl', ExecutionSnapshotsController);

    function ReplaysController($scope, $q, $state, $stateParams, $interval, $timeout, config, TaskFactoryService, TaskService, Pagination, spinner, TASK_ENUM, REPLAY_MODE, RENT_TYPE, RENT_MODAL_STEP, DialogService, RentModalService) {

        var pageIndex,timer;
        $scope.isComptestTask = $state.current.name == 'app.comptesttasks' || $state.current.name == "app.timedComptesttasks"; // 定时兼容性也属于兼容性测试
        $scope.isTimedTask = $state.current.name == "app.timedReplaytasks" || $state.current.name == "app.timedComptesttasks" || $state.current.name == "app.dialtesttasks"; // 定时任务是新的get、delete、post接口

        $scope.customer = config.customer;
        $scope.REPLAY_MODE = REPLAY_MODE;
        $scope.replayModes = $scope.isComptestTask ? [REPLAY_MODE.comptest, REPLAY_MODE.monkey] : [REPLAY_MODE.oldInitValue, REPLAY_MODE.image, REPLAY_MODE.text];
        $scope.searches = {};
        $scope.isAutoRefresh = false;
        $scope.filters = TaskService.getFilters();
        $scope.sub_replay_type = $state.current.name == "app.dialtesttasks" ? TASK_ENUM.subReplayType.dialtest : null;

        $scope.pagination = new Pagination(function(pageNum, size, searches) {
            return TaskService.getTasks($stateParams.key, TASK_ENUM.taskType.replay, pageNum, TaskService.replayFilter, $scope.replayModes, $scope.isTimedTask, searches, $scope.sub_replay_type);
        });

        $scope.getFilterTable = function() {
            var searches = _.cloneDeep($scope.searches);
            var pattern = null;
            if ($scope.searches.created) {
                if ($scope.searches.created.length <= 10) { //精确到日期
                    pattern = new RegExp(/^(20|21|22|23|[0-1]\d):[0-5]\d:[0-5]\d$/);
                    searches.created = $scope.searches.created + ' 00:00:00';
                } else {                                    //精确到时分秒
                    pattern = new RegExp(/^\d{4}-(?:0\d|1[0-2])-(?:[0-2]\d|3[01])( (?:[01]\d|2[0-3])\:[0-5]\d\:[0-5]\d)?$/);
                }
                if ($scope.searches.created && !(pattern.exec($scope.searches.created))) {
                    if (!_validDateExist($scope.searches.created)) {
                        return DialogService.error('开始时间格式错误！');
                    }
                }
            }
            if ($scope.searches.completed_time) {
                if ($scope.searches.completed_time.length <= 10) { //精确到日期
                    pattern = new RegExp(/^(20|21|22|23|[0-1]\d):[0-5]\d:[0-5]\d$/);
                    searches.completed_time = $scope.searches.completed_time + ' 23:59:59';
                } else {                                    //精确到时分秒
                    pattern = new RegExp(/^\d{4}-(?:0\d|1[0-2])-(?:[0-2]\d|3[01])( (?:[01]\d|2[0-3])\:[0-5]\d\:[0-5]\d)?$/);
                }
                if ($scope.searches.completed_time && !(pattern.exec($scope.searches.completed_time))) {
                    if (!_validDateExist($scope.searches.completed_time)) {
                        return DialogService.error('结束时间格式错误！');
                    }
                }
            }

            if ($scope.searches.schedule_time) {
                if ($scope.searches.schedule_time.length <= 10) { //精确到日期
                    pattern = new RegExp(/^(20|21|22|23|[0-1]\d):[0-5]\d:[0-5]\d$/);
                    searches.schedule_time = $scope.searches.schedule_time + ' 00:00:00';
                } else {                                    //精确到时分秒
                    pattern = new RegExp(/^\d{4}-(?:0\d|1[0-2])-(?:[0-2]\d|3[01])( (?:[01]\d|2[0-3])\:[0-5]\d\:[0-5]\d)?$/);
                }
                if ($scope.searches.schedule_time && !(pattern.exec($scope.searches.schedule_time))) {
                    if (!_validDateExist($scope.searches.schedule_time)) {
                        return DialogService.error('发起时间格式错误！');
                    }
                }
            }
            if ($scope.searches.end_time) {
                if ($scope.searches.end_time.length <= 10) { //精确到日期
                    pattern = new RegExp(/^(20|21|22|23|[0-1]\d):[0-5]\d:[0-5]\d$/);
                    searches.end_time = $scope.searches.end_time + ' 23:59:59';
                } else {                                    //精确到时分秒
                    pattern = new RegExp(/^\d{4}-(?:0\d|1[0-2])-(?:[0-2]\d|3[01])( (?:[01]\d|2[0-3])\:[0-5]\d\:[0-5]\d)?$/);
                }
                if ($scope.searches.end_time && !(pattern.exec($scope.searches.end_time))) {
                    if (!_validDateExist($scope.searches.end_time)) {
                        return DialogService.error('截止时间格式错误！');
                    }
                }
            }

            if ($scope.searches.created && $scope.searches.completed_time) {
                var created = new Date($scope.searches.created);
                var completed_time = new Date($scope.searches.completed_time);
                if (created.getTime() > completed_time.getTime()) {
                    return DialogService.error('开始时间不能大于结束时间，请重新输入！');
                }
            }

            if ($scope.searches.schedule_time && $scope.searches.end_time) {
                var schedule_time = new Date($scope.searches.schedule_time);
                var end_time = new Date($scope.searches.end_time);
                if (schedule_time.getTime() > end_time.getTime()) {
                    return DialogService.error('发起时间不能大于截止时间，请重新输入！');
                }
            }
            
            function _validDateExist(dateString) {
                return dateString.substring(5,7) > new Date(dateString).getMonth();
            }
            
            return TaskService.getTasks($stateParams.key, TASK_ENUM.taskType.replay, 1, TaskService.replayFilter, $scope.replayModes, $scope.isTimedTask, searches, $scope.sub_replay_type).then(function (res) {
                $scope.pagination.data = res.results;
                $scope.pagination.index = 1;
                $scope.pagination.size = $scope.pagination.data.length;
                $scope.pagination.searches = $scope.searches;
                $scope.pagination.next = res.next;
            });
        }

        $scope.chooseFilter = function(choose, filterName) {
            $scope.filters[filterName].selected = choose;
            if (choose != 'all') {
                $scope.searches[filterName] = $scope.filters[filterName].data[choose].value;
            } else {
                delete $scope.searches[filterName];
            }
            $scope.getFilterTable();
        }

        $scope.inputFilter = function(value, key) {
            if (value) {
                $scope.searches[key] = value;
            } else {
                delete $scope.searches[key];
            }
        }

        $scope.createReplayTask = function(replayMode) {
            TaskFactoryService.createReplayTask($scope.app, undefined, replayMode);
        }

        $scope.createComptestTask = function() {
            TaskFactoryService.createComptestTask($scope.app);
        }

        $scope.createDialtestTask = function() {
            TaskFactoryService.createDialtestTask($scope.app);
        }

        $scope.createTaskWithParams = function(replayMode, files) {
            TaskService.readFile(files, function(file) {
                TaskFactoryService.createTaskWithParams(replayMode, $scope.app, file);
            });
        }

        $scope.createReport = function() {
            var taskIds = _.chain($scope.pagination.data).filter({
                checked: true
            }).map("id").join(",").value();
            if (taskIds) {
                if ($scope.isTimedTask) {
                    $state.go('app.timedReplaytaskchooseexecutions', {
                        ids: taskIds
                    });
                } else {
                    $state.go('app.replaychooseexecutions', {
                        ids: taskIds
                    });
                }
            }
        }

        $scope.openDialtestReport = function() {
            window.open($state.href("dialtestOverview", {
                appKey: $scope.app.key
            }), '_blank');
        }

        $scope.openDialtestTables = function() {
            window.open($state.href("dialtestTables", {
                appKey: $scope.app.key
            }), '_blank');
        }

        $scope.updateTimedTasks = function(task) {
            spinner.show();
            RentModalService.open({
                    task: task,
                    app: $scope.app,
                    step: RENT_MODAL_STEP.chooseTime,
                    rentType: RENT_TYPE.replay,
                    lastStepText: "更新"
                })
                .then(function() {
                    var params = _.cloneDeep(task); //避免时间格式转换后引起列表变化
                    params.schedule_time = params.scheduleTime;
                    params.end_time = params.endTime;
                    params.dead_line = params.deadLine;
                    params.repeat_times = params.repeatTimes;
                    params.period = params.periodValue;
                    params.mail_group = params.isSendmail == 1 ? params.mail_group : null;
                    params.send_report = params.send_report == 1 ? true : false;
                    params.save_video = params.save_video == 1 ? true : false;
                    if (!params.which_time_start) delete params.which_time_start;
                    if (!params.which_time_stop) delete params.which_time_stop;
                    delete params.scheduleTime;
                    delete params.endTime;
                    delete params.deadLine;
                    delete params.repeatTimes;
                    delete params.periodValue;
                    delete params.isSendmail;
                    return TaskService.updateTimedTasks(params);
                }).then(function(){
                    $state.reload();
                }).catch(function() {
                    $state.reload();
                })
        };

        $scope.deleteTask = function(task) {
            DialogService.confirm({
                    title: "提示",
                    message: "任务(" + task.name + ")包含" + task.execution_count + "条执行用例，删除后数据不可恢复，确定删除？",
                    sureText: "删除",
                    type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
                })
                .then(function() {
                    var promise = $scope.isTimedTask ? TaskService.deleteTimedTask(task) : TaskService.deleteTask(task.id);

                    promise.then(function() {
                        $state.reload();
                    });
                });
        }

        $scope.deleteTasks = function() {
            var taskIds = _.chain($scope.pagination.data).filter({
                checked: true
            }).map("key").value();
            if (taskIds.length == 0) {
                return DialogService.alert("请选择要删除的任务！");
            }
            DialogService.confirm({
                title: "提示",
                message: "批量删除任务会同时删除任务包含的执行用例，且删除后数据不可恢复，确定删除？",
                sureText: "删除",
                type: DialogService.DIALOG_TYPE.CONFIRM_WARNING
            }).then(function() {
                return TaskService.deleteTasks(taskIds);
            }).then(function() {
                $state.reload();
            });
        }

        $scope.rerunTask = function(task) {
            TaskService.getExecutions(task.id).then(function(executions) {
                TaskFactoryService.rerunExecutions($scope.app, task, executions);
            });
        }

        $scope.filterTasks = function() {
            TaskService.openFilterTasksWindow({
                app: $scope.app,
                filterTestCases: TaskService.replayFilter
            }).then(function(testcases) {
                TaskService.replayFilter = testcases;
                $state.go($state.current, {clearFilter: false}, {reload: true});
            });
        }

        $scope.isShowDownload = function() {
            return $scope.customer == 'INTASECT';
        }

        $scope.downloadResult = function(task) {
            return TaskService.downloadResult(task);
        }

        $scope.autoRefreshTable = function() {
            $scope.isAutoRefresh = !$scope.isAutoRefresh;
            if ($scope.isAutoRefresh) {
                _refreshTable();
            } else {
                $interval.cancel(timer)
            }
        }

        function _refreshTable() {
            pageIndex = 0;
            timer = $interval(function () {
                if (!_.find($scope.pagination.data, function (task, index) {
                        pageIndex = Math.floor(index / 30);
                        return task.progress < 1;
                    })) {
                    $interval.cancel(timer)
                } else {
                    var scrollTop = $('.tasks-container').scrollTop();
                    var checkedIds = _.chain($scope.pagination.data).filter({checked: true}).map("id").value();
                    $scope.getFilterTable().then(function () {
                        $timeout(function() {
                            $('.tasks-container').scrollTop(scrollTop);
                        })
                        _.each($scope.pagination.data, function(item) {
                            checkedIds.indexOf(item.id) > -1 && (item.checked = true);
                        });
                    });
                }
            }, 10000);
        }

        $scope.$on('$destroy', function () {
            $interval.cancel(timer);
        });

        $scope.clickedId = TaskService.recordClickId($state.current.controller);
        $scope.recordClickId =  function recordClickId(clickedId) {
            $scope.clickedId = TaskService.recordClickId($state.current.controller, clickedId);
        }
    }

    function ReplayStfController($scope, $rootScope, $stateParams, $state, $http, $timeout, $q, StfService, TaskService, DialogService, spinner) {


        //TODO execution 改成Django和stf直接通信分配用例,此controller未使用,暂时保留
        $scope.task = $stateParams.task;
        $scope.backRoute = $stateParams.backRoute;
        $scope.completed = false;

        if (!$stateParams.task) {
            $state.go("^." + $scope.backRoute);
        }

        _listenPageLeave();
        _initReplays();

        function _initReplays() {
            var DELAY_TIME = 2000;
            var deviceExecutionMap,
                replayPromises,
                replayReqsResults = [],
                replayReqsCount = 0;

            //根据设备进行分组
            deviceExecutionMap = _.groupBy($scope.task.replay_rules.executions, function(item) {
                return item.rentKey;
            });

            angular.forEach(deviceExecutionMap, function(executions, rentKey) {
                var url = 'http://' + executions[0].device.public_ip + ':' + executions[0].device.port;
                $timeout(function() {
                    return TaskService.sendReplayExections($scope.task, url, rentKey, executions)
                        .then(function() {
                            _countRequestResult({reject: false, executionKeys: _.map(executions, 'executionKey')});
                        }, function() {
                            _countRequestResult({reject: true, executionKeys: _.map(executions, 'executionKey')});
                        });
                }, (replayReqsCount++) * DELAY_TIME);
            });

            //$q.all无法保证在所有promise完成后再执行，故使用回调函数统计请求完成数量的方式处理
            function _countRequestResult(data) {
                replayReqsResults.push(data);
                if (replayReqsResults.length == replayReqsCount) {
                    $scope.completed = true;
                    var rejectExecutionKeys = _.chain(replayReqsResults).filter({reject: true}).map('executionKeys').flattenDeep().value();
                    if (_.isEmpty(rejectExecutionKeys)) {
                        $state.go("^." + $scope.backRoute);
                    } else {
                        DialogService.error(rejectExecutionKeys.length + "台设备回放失败!");
                        _abortTask(null, rejectExecutionKeys);
                    }
                }
            }
        }

        function _listenPageLeave() {
            var replayStateName = $state.current.name;

            window.onbeforeunload = function() {
                if (!$scope.completed && _isInReplayState()) {
                    return "您的回放任务还没创建完成，是否离开?"
                }
            }

            window.onunload = function() {
                if (!$scope.completed && _isInReplayState()) {
                    _abortTask();
                }
            }

            var removeListener = $rootScope.$on("$stateChangeStart", onBeforeLeaveControlPage);

            function onBeforeLeaveControlPage(event, toState, toParams, fromState, fromParams) {
                if (!$scope.completed && _isInReplayState()) {
                    event.preventDefault();
                    spinner.hide();
                    DialogService.confirm("您的自动回放任务还没创建成功，离开后将结束任务，是否离开？")
                        .then(function() {
                            removeListener();
                            _abortTask({
                                toState: toState,
                                toParams: toParams
                            });
                        });
                } else {
                    removeListener();
                }
            }

            function _isInReplayState(fromState) {
                return replayStateName == (fromState || $state.current).name;
            }
        }

        function _abortTask(opts, executionKeys) {
            TaskService.abortTask($scope.task.id, executionKeys).then(function() {
                if (opts) {
                    $state.go({
                        name: opts.toState.name,
                        params: opts.toParams
                    });
                } else {
                    $state.go("^." + $scope.backRoute);
                }
            });
        }
    }

    function ExecutionResultUpdateController(TaskService, $uibModalInstance, TbUUID, result, executions, model, EDIT_MODE) {
        var vm = this;

        vm.result = result;
        vm.params = {
            execution_keys: _.map(executions, "key"),
            desc: executions.length > 1 ? "" : vm.result.desc,// 结果修改未非成功和批量需改结果需要传非空desc字段
            result_subtype_key: vm.result.result_subtype_json && vm.result.result_subtype_json[0] ? vm.result.result_subtype_json[0].key : vm.result.result_subtypes[0].key
        };

        // 图片结果编辑要多一个参数:exception_image_url
        if (model.editMode == EDIT_MODE.snapshot_result_mode) {
            if (model.imageUrl) {
                vm.params.exception_image_url = model.imageUrl;
            } else {
                vm.params.exception_image_urls = model.imageUrls;
            }
        }

        vm.close = close;
        vm.cancel = cancel;

        function close() {
            if (model.imageUrls) {
                vm.params.exp_key = TbUUID.getUUID();//前端生成uuid作为key
                $uibModalInstance.close(vm.params);
            } else {
                TaskService.updateExecutionResult(model.replayId, vm.params).then(function() {
                    $uibModalInstance.close();
                });
            }
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

    function ExecutionSnapshotsController($uibModalInstance, $stateParams, ModalService, DialogService, TaskService, execution, isComptest, snapshots, procedures, problems, replayId, EDIT_MODE) {
        var vm = this;

        vm.snapshots = snapshots;
        vm.isComptest = isComptest;
        vm.problems = problems || [];
        vm.procedures = procedures || [];
        vm.testSteps = [{}];
        vm.procedureDesc = {testFunctionPoints:'',expectResult:''};
        vm.showFancybox = showFancybox;
        vm.updateSnapshotResult = updateSnapshotResult;
        vm.deleteSnapshot = deleteSnapshot;
        vm.close = close;
        vm.cancel = cancel;
        vm.statusText = execution.is_todo ? "已处理" : "待处理";
        vm.changeStatus = changeStatus;
        vm.checkSnapshots = checkSnapshots;
        vm.addProblem = addProblem;
        vm.deleteProblem = deleteProblem;
        vm.clearCheckAdds = clearCheckAdds;
        vm.checkForAdd = checkForAdd;
        vm.checkConfirm = checkConfirm;
        vm.deleteProcedure = deleteProcedure;
        vm.addProcedures = addProcedures;
        vm.showProcedureImgs = showProcedureImgs;
        vm.addProcedureDesc = addProcedureDesc;
        vm.addSteps = addSteps;

        if (vm.procedures.length > 0 && vm.snapshots.length > 0) {
            _setProcedureUrl();
        }

        function checkSnapshots(problem) {
            //先清空选中
            _.forEach(vm.snapshots, function(snapshot) {
                snapshot.checked = false;
            })
            _.forEach(vm.snapshots, function(snapshot) {
                _.forEach(problem.images, function(image) {
                    if (image == snapshot.url) {
                        snapshot.checked = true;
                    }
                });
            });
        }

        function addProblem() {
            var imageUrls = _.chain(vm.snapshots).filter({
                checked: true
            }).map("url").value();
            if (imageUrls.length == 0) {
                return DialogService.alert("请至少选择一张截图！");
            }
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/result.update.html',
                controller: 'ExecutionResultUpdateCtrl',
                controllerAs: 'vm',
                resolve: {
                    result: function() {
                        return TaskService.getExecutionResult(execution.id, EDIT_MODE.snapshot_result_mode);
                    },
                    executions: function() {
                        return [execution];
                    },
                    model: function() {
                        return {
                            replayId: replayId,
                            editMode: EDIT_MODE.snapshot_result_mode,
                            imageUrls: imageUrls
                        }
                    }
                }
            }).then(function(params) {
                TaskService.addProblem(params, execution.id).then(function() {
                    return TaskService.getExecutionResult(execution.id, EDIT_MODE.snapshot_result_mode);
                }).then(function(res) {
                    vm.problems = res.result_subtype_json;
                });
            });
        }

        function deleteProblem(problem) {
            var params = {
                exp_key: problem.exp_key,
            };
            TaskService.deleteProblem(params, execution.id).then(function() {
                return TaskService.getExecutionResult(execution.id, EDIT_MODE.snapshot_result_mode);
            }).then(function(res) {
                vm.problems = res.result_subtype_json;
            });
        }

        //给vm.procedures赋值url
        function _setProcedureUrl() {
            var imgHost = _getImgHost();
            _.each(vm.procedures, function(procedure) {
                procedure.urls = [];
                _.each(procedure.actions, function(action) {
                    procedure.urls.push(imgHost + action);
                });
            });
        }

        //获取图片路径前缀
        function _getImgHost() {
            var url = vm.snapshots[0].url;
            var key = vm.snapshots[0].key;
            return url.replace(key, '');
        }

        function updateSnapshotResult(snapshot) {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/result.update.html',
                controller: 'ExecutionResultUpdateCtrl',
                controllerAs: 'vm',
                resolve: {
                    result: function() {
                        return TaskService.getExecutionResult(execution.id, EDIT_MODE.snapshot_result_mode);
                    },
                    executions: function() {
                        return [execution];
                    },
                    model: function() {
                        return {
                            replayId: replayId,
                            editMode: EDIT_MODE.snapshot_result_mode,
                            imageUrl: snapshot.url
                        }
                    }
                }
            })
        }

        function deleteSnapshot(key) {
            DialogService.confirm("确定删除该截图?").then(function() {
                TaskService.deleteSnapshot(execution.id, key).then(function() {
                    _.remove(vm.snapshots, function(snapshot) {
                        return snapshot.key == key;
                    })
                })
            })
        }

        function clearCheckAdds() {
            //打开新增步骤的时候，清空已经选中的snapshots
            _.forEach(vm.snapshots, function(snapshot) {
                if (snapshot.checked) {
                    delete snapshot.checked;
                }
            });
        }

        function checkForAdd(snapshot, index) {
            if (snapshot.checked) {
                delete snapshot.checked;
            } else {
                var checkedSnapshots = _.filter(vm.snapshots, { checked: true});
                if(checkedSnapshots.length > 0){
                    checkedSnapshots[0].checked = false;
                }
                snapshot.checked = true;
                // if (checkedSnapshots.length == 1) {
                //     var latestIndex = _.findIndex(vm.snapshots, function(o) { return checkedSnapshots[0].key == o.key; })
                //     if (latestIndex < index) {
                //         _checkStartBetweenEnd(latestIndex, index);
                //     } else {
                //         _checkStartBetweenEnd(index, latestIndex);
                //     }
                // }
            }

            // function _checkStartBetweenEnd(start, end) {
            //     _.forEach(vm.snapshots, function (snapshot, index) {
            //         if (index > start && index < end) {
            //             snapshot.checked = true;
            //         }
            //     });
            // }
        }

        function checkConfirm() {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/snapshots.procedure.add.html',
                windowClass: 'snapshot-modal-bigger',
                controller:'ExecutionSnapshotsCtrl',
                controllerAs: 'vm',
                size: 'large',
                resolve: {
                    execution: function() {
                        return execution;
                    },
                    isComptest: function() {
                        return isComptest;
                    },
                    snapshots: function() {
                        return snapshots;
                    },
                    replayId: function() {
                        return replayId;
                    },
                    procedures: function() {
                        return procedures;
                    },
                    problems: function() {
                        return problems;
                    }
                }
            }).then(function () {
                vm.isAdd = false;
            })
            // DialogService.input('请输入该步骤的名称').then(function(name) {
            //     var checkedSnapshots = _.chain(vm.snapshots).filter({
            //             checked: true
            //         });
            //     vm.procedures.push({
            //         name: name,
            //         actions: checkedSnapshots.map("key").value(),
            //         urls: checkedSnapshots.map("url").value()
            //     });
            //     vm.isAdd = false;
            // });
        }

        function addProcedureDesc() {
            if(vm.procedureDesc.testFunctionPoints === ''){
                DialogService.alert("测试功能点不能为空！");
                return;
            }
            if(vm.procedureDesc.expectResult === ''){
                DialogService.alert("预期结果不能为空！");
                return;
            }
            var checkedSnapshots = _.chain(vm.snapshots).filter({
                    checked: true
                });
            vm.procedures.push({
                name: vm.procedureDesc.testFunctionPoints,
                actions: checkedSnapshots.map("key").value(),
                urls: checkedSnapshots.map("url").value(),
                expect_result: vm.procedureDesc.expectResult,
                desc: vm.testSteps
            });
            close();
        }

        function addSteps() {
            var isEmptyStep = false, row;
            _.each(vm.testSteps, function (testStep, index) {
                if (_.isEmpty(_.trim(testStep.name))) {
                    row = index;
                    isEmptyStep = true;
                    return false;
                }
            });
            if (isEmptyStep) {
                DialogService.confirm("第" + (row + 1) + "行步骤内容不能为空!")
            } else {
                vm.testSteps.push({name: ""});
            }
        }

        function showProcedureImgs(procedure) {
            ModalService.show({
                templateUrl: 'apps/task/replay/templates/snapshots.procedure.html',
                windowClass: 'dialog-snapshots',
                model: {
                    urls: procedure.urls,
                }
            });
        }

        function deleteProcedure(index) {
            vm.procedures.splice(index, 1);
        }

        function addProcedures() {
            _.each(vm.procedures, function(procedure) {
                delete procedure.urls;
            });
            var params = {
                procedure: vm.procedures
            }
            return TaskService.addProcedures(params, $stateParams.taskId).then(function() {
                vm.close();
            });
        }

        function close() {
            $uibModalInstance.close();
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function changeStatus() {
            TaskService.updateExecutionResult(replayId, {execution_keys: [execution.key], is_todo: !execution.is_todo})
            close();
        }

        var fancyImages = _.map(vm.snapshots || [], function (image, index) {
            return {
                href: image.url,
                title: (index + 1).toString(),
                helpers: {
                    title: { type: 'inside' }
                }
            }
        });
        function showFancybox(index) {
            $.fancybox(fancyImages, {index: index})
        }
    }
})();

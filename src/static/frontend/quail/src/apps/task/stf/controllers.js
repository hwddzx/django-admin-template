angular.module('control-panes')
    .controller('ControlPanesCtrl', ControlPanesController);

function ControlPanesController($scope, $state, $stateParams, $timeout, $q, $uibModal, spinner, DialogService, ModalService, CountDownService, StfService, TaskService, config, TASK_ENUM, TESTCASE_ENUM) {

    if (!$stateParams.task) {
        try {
            $state.go(config.fromState.name, {
                key: $stateParams.appKey
            });
        } catch (e) {
            $state.go("app.testcases", {
                key: $stateParams.appKey
            });
        }
        return;
    }

    $scope.config = config;
    $scope.dtUrl = config.urls.dt;
    $scope.app = $stateParams.app;
    $scope.task = $stateParams.task;
    $scope.rioDevice = $scope.task.device;
    $scope.rioDevice.rentKey = $scope.task.device.rent_key;
    $scope.rioDevice.serial = $scope.rioDevice.key;
    $scope.device = null;
    $scope.control = null;
    $scope.webSocketUrl = null;
    $scope.execution = null;
    $scope.executionCount = $scope.task.execution_count || 0;
    $scope.testcases = $stateParams.task.testcases || [];
    $scope.testcaseInitialCount = $scope.testcases.length;
    $scope.task.isScriptRecord = ($scope.task.type == TASK_ENUM.taskType.record);
    $scope.priorityDef = TESTCASE_ENUM.priority;
    $scope.backendClosedWS = false; // 后端是否断开ws
    $scope.quailStopRent = false; //quail主动退租
    $scope.deviceType = /android/i.test($scope.rioDevice.os) ? 'android' : 'ios';
    $scope.recordTestId = $scope.testcases[0] && $scope.testcases[0].id; // 因为完成一个用例录制之后会删除testcase,导致拿不到id,所以先记录下来,用于录制完成之后跳转选中该用例
    $scope.waitTrusted = false;

    _init();

    $scope.startExecution = function() {
        if ($scope.task.isScriptRecord && _.isEmpty($scope.testcases)) {
            return DialogService.alert("您的用例已经录制完毕!");
        }

        // 任务分发不用创建task和创建execution
        if ($scope.task.isDistribute) {
            // 任务分发界面已经第一次调用startDistributeTask
            if ($scope.testcaseInitialCount - $scope.testcases.length == 0) {
                return _startExecution($scope.task);
            }

            return TaskService.startDistributeTask($scope.testcases[0].id).then(function(data) {
                return _startExecution(data);
            }).catch(_catch);
        }

        //每次开始测试执行时，取testcases第一个用例为当前用例，执行测试完成后，删除当前用例
        return TaskService.createExecution($scope.task.id, $scope.testcases[0]).then(function(data) {
            spinner.show();
            return _startExecution(data);
        }).catch(_catch).finally(function() {
            spinner.hide();
        });

        function _catch(e) {
            //如果stf或后端创建执行失败，则删除当前执行，且终止当前任务.
            DialogService.alert("服务异常，任务终止.")
                .then(function() {
                    $scope.completeTask(null, true)
                });
            return $q.reject(e);
        }

        function _startExecution(data) {
            spinner.show();
            // 任务分发execution执行完之后保存最后一个key,传给Django,Django去退租手机.
            if ($scope.task.isDistribute) {
                $scope.task.key = data.key;
            }
            return $scope.control.startExecution(data.key, $scope.task.release.package_name, $scope.task.release.main_activity, $scope.task.isScriptRecord).then(function() {
                $scope.execution = {
                    // name = 测试任务名_case_n
                    name: data.testcase ? data.testcase.name : '探索测试',
                    refer_key: data.testcase ? data.testcase.code : '',
                    refer_url: '',
                    result: TASK_ENUM.executionResult.passed, //默认成功
                    severity: TASK_ENUM.executionSeverity.critical, //默认严重
                    desc: '',
                    snapshots: [],
                    scenario: data.testcase ? data.testcase.top_scenario : '',
                    hasTestcase: data.testcase ? true : false
                };
                _.extend($scope.execution, data);

                // 任务分发data.name返回的是app名称,$scope.execution应该为data.testcase.name
                if($scope.task.isDistribute){
                    $scope.execution.name = data.testcase.name;
                }

                $scope.executionCount++;
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'UserAction',
                    eventAction: 'execution-start'
                });
                spinner.hide();
            }, function(e) {
                spinner.hide();
                !$scope.task.isDistribute && TaskService.deleteExecution(data);
                return $q.reject(e);
            });
        }
    };


    $scope.saveExecution = function(isCompleteTask) {

        if ($scope.waitTrusted) {
            return DialogService.alert("请在iPhone/iPad上设置信任应用!");
        }

        if ($scope.task.isScriptRecord) {
            if (_isLastTestcase()) {
                return DialogService
                    .confirm("确定保存并且结束录制吗?")
                    .then(function() {
                        $scope.execution.over = true;
                        _saveExecution($scope.execution, true);
                    });
            }

            return _saveExecution($scope.execution, isCompleteTask).then(function() {
                if (!isCompleteTask) {
                    $scope.startExecution();
                }
            });
        }

        var modelExecution = _.clone($scope.execution);
        modelExecution.isLast = $scope.testcases.length < 2;
        ModalService.show({
            templateUrl: 'apps/task/stf/templates/execution.modal.html',
            model: modelExecution,
            backdrop: 'static'
        }).then(function(model) {
                return $q(function(resolve) {
                    //执行完最后一条测试用例时，需要提示用户继续测试还是结束任务
                    if (!model.over && _isLastTestcase()) {
                        if ($scope.task.isDistribute) {
                            DialogService.confirm({message: "您选择的测试用例已执行完毕，保存后将直接结束录制"}).then(function () {
                                model.over = true;
                            }).then(function () {
                                resolve(model);
                            })
                        } else {
                            DialogService.confirm({
                                message: "您选择的测试用例已执行完毕，是否结束任务？",
                                cancelText: "继续测试",
                                sureText: "结束任务"
                            }).then(function () {
                                model.over = true;
                            }).finally(function () {
                                resolve(model);
                            })
                        }
                    } else {
                        resolve(model);
                    }
                });
            })
            .then(_saveExecution);

        function _saveExecution(model, isForceStop) {
            if (isCompleteTask) {
                model.over = true;
            }

            if (model.result != TASK_ENUM.executionResult.failed) {
                model.severity = null;
            }

            // 用例管理-录制用例之后,保存录制用例使用新接口
            return ($scope.task.isScriptRecord && !$scope.task.isDistribute ? $q.when() : TaskService.completeExecution(model, $scope.task.isScriptRecord, "complete")
                /*.then(function() {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'execution-save',
                        eventLabel: model.name
                    });
                    spinner.show();
                    return $scope.control.completeExecution(model.key, $scope.task.isScriptRecord);
                })*/)
                .then(function() {
                    $scope.testcases.shift();
                    $scope.$broadcast("reset:accordion");
                    $scope.task.isScriptRecord && !$scope.task.isDistribute ? ($scope.action = "complete"): ($scope.execution = null);
                    if (model.over) {
                        $scope.completeTask(null, isForceStop, true);
                    }
                })
                .catch(function(e) {
                    //保存execution则，清除execution
                    $q.when($scope.task.isScriptRecord ? DialogService.alert("保存录制脚本失败!") : "")
                        .then(function() {
                            $scope.clearExecution();
                        });
                    return $q.reject(e);
                })
                .finally(function() {
                    spinner.hide();
                })
        }

        function _isLastTestcase() {
            return ($scope.testcaseInitialCount && $scope.testcases.length == 1);
        }
    };

    $scope.resetExecution = function() {
        if ($scope.execution) {
            DialogService.confirm("重置将删除当前用例数据，是否继续？")
                .then($scope.clearExecution)
                .then(function() {
                    if ($scope.task.isScriptRecord) {
                        $scope.startExecution()
                    }
                });
        }
    };

    $scope.clearExecution = function() {
        // 录制新接口不删除execution,也不用通知tc
        if ($scope.task.isScriptRecord && !$scope.task.isDistribute) {
            return $q.when();
        }

        var executionKey = $scope.execution.key;
        var promises = $scope.task.isDistribute ? [] : [TaskService.deleteExecution($scope.execution).then(function() {
            $scope.$broadcast("reset:accordion");
            $scope.execution = null;
            $scope.executionCount--;
        })];
        /*if (!$scope.backendClosedWS) {
            config.ignoreSpinner = true;
            spinner.show();
            promises.push($scope.control.abortExecution(executionKey, $scope.task.isScriptRecord).then(function(){
                config.ignoreSpinner = false;
                spinner.hide();
            }));
        }*/
        return $q.all(promises);
    };

    $scope.goApps = function() {
        var toState = {
            name: 'apps'
        };
        $scope.completeTask(toState, true);
    }

    $scope.goTasks = function() {
        var toState = {
            name: 'apps',
            params: {
                key: $scope.app.key
            }
        };
        $scope.completeTask(toState, true);
    }

    $scope.completeTask = function(toState, isForceStop, notAlertModel, callback) {

        if ($scope.waitTrusted) {
            return DialogService.alert("请在iPhone/iPad上设置信任应用!");
        }

        $scope.quailStopRent = true;

        if (isForceStop) {
            return _completeTask();
        }

        if ($scope.execution) {
            return DialogService.confirm("您的测试用例还未保存,是否退出?").then($scope.clearExecution)
                .then(function() {
                    return _completeTask();
                }, _hideSpinner);
        } else {
            if(notAlertModel){
                return _completeTask();
            }
            if ($scope.task.isDistribute) {
                return _completeTask()
            }
            return DialogService.confirm("是否确认要结束任务?")
                .then(function() {
                    return _completeTask();
                }, _hideSpinner);
        }

        function _hideSpinner() {
            if (toState) {
                spinner.hide();
            }
            return $q.reject();
        }

        function _completeTask() {
            var nextState = $scope.task.isDistribute ? "app.distribute" : ($scope.task.isScriptRecord ? "app.testcases" : "app.tasks");
            if (!callback) {
                callback = function() {
                    if (toState) {
                        $state.go(toState.name, toState.params);
                    } else {
                        $state.go(nextState, {
                            key: $stateParams.app.key,
                            selectNodeId: $scope.recordTestId // 回到app.testcases需要选中当前录制的用例
                        });
                    }
                };
            }

            var taskId = $scope.task.isDistribute ? $scope.task.task_id : $scope.task.id,
                executionKeys = _.chain($scope.task.testcases).map("key").value();

            var params = {};
            if ($scope.task.isDistribute) {
                params.last_execution_key = $scope.task.key;
            }

            var promise;
            if ($scope.notCompleteRecord) {
                promise = $q.when();
            } else if ($scope.task.isScriptRecord && !$scope.task.isDistribute) {
                promise = TaskService.completeRecord(taskId, $scope.execution ? $scope.execution.id : undefined, $scope.action == "complete" ? "complete" : "abort")
            } else {
                promise = TaskService.completeTask(taskId, params);
            }
            return promise.then(function() {
                spinner.show();
                $scope.timeCounter.clear();
                $scope.client.disconnect($scope.task.isScriptRecord && !$scope.task.isDistribute);
                callback();
                spinner.hide();
            });
        }

    };

    $scope.inputTextDialog = function() {
        $scope.$emit("inputTextDialog", {body: 'on'});
    };

    $scope.trustedApp = function() {
        $scope.waitTrusted = false;
    };

    function _init() {

        //保留countdown，兼容front-stf-core中的写法
        $scope.timeCounter = $scope.countdown = CountDownService.createInstance({reverse: true});

        var client = $scope.client = StfService.createClient({
                scope: $scope,
                device: $scope.rioDevice,
                token: $scope.task.rio_token,
                beforeunload: function() {
                    return "您的任务还没完成，是否要结束任务？";
                }
            });

        window.client = client;

        client.watchs({
            //连接成功
            'connect.done': function(data) {
                $scope.device = data.device;
                $scope.control = data.control;
                $scope.countdown.start();
                $timeout(function() {
                    _installApp();
                });

                $scope.socket = client.getSocket();
                $scope.socket.on("disconnect", function() {
                    if (!$scope.quailStopRent) {
                        DialogService.alert("当前网络异常无法继续录制！").then(function() {
                            // $scope.action被赋值,则表示已经调用过新接口报错录制
                            if (!$scope.action) {
                                $scope.action = "complete";
                                $scope.completeTask(null, true);
                            }
                        })
                    }
                });
                $scope.socket.on("wait.trusted", function() {
                    // 需要提示用户在iPhone/iPad上设置信任应用
                    $scope.waitTrusted = true;
                });
                $scope.socket.on("device.launchFail", function() {
                    if ($scope.waitTrusted) {
                        //未点击信任导致app启动失败
                        DialogService.alert("app超时3分钟未信任该应用，即将退出录制界面").then(function() {
                            $scope.waitTrusted = false;
                            $scope.completeTask(null, true);
                        });
                    } else {
                        //app因其他原因启动失败
                        DialogService.alert("app启动失败").then(function() {
                            $scope.completeTask(null, true);
                        });
                    }
                });
                //监听回放完成的消息
                $scope.socket.on("device.replayFinish", function(data, body) {
                    $scope.$broadcast("replayFinish");
                    if (body.success) {
                        DialogService.alert('回放完成！');
                    } else {
                        DialogService.alert(body.data);
                    }
                });
            },
            //连接失败
            'connect.failed': function(reject) {
                DialogService.error(reject.msg).then(function() {
                    $scope.completeTask(null, true);
                });
            },
            //重连成功
            'reconnect.done': function() {
                if ($scope.execution) {
                    if ($scope.task.isScriptRecord) {
                        if ($scope.task.isDistribute) {
                            //脚本录制时，设备恢复则中断当前用例，并重新开始当前用例
                            DialogService.alert("设备故障，将重置当前录制!")
                                .then($scope.clearExecution)
                                .then(function() {
                                    spinner.show();
                                    $scope.startExecution().then(function() {
                                        spinner.hide();
                                    })
                                });
                        }
                    } else {
                        //自助功能测试，断开重连后，再次发送launch exeception 到stf
                        spinner.show();
                        $scope.control.startExecution($scope.execution.key, $scope.task.release.package_name, $scope.task.release.main_activity, $scope.task.isScriptRecord)
                            .finally(function() {
                                spinner.hide();
                            });
                    }
                }
            },
            //重连失败
            'reconnect.failed': function() {
                if ($scope.task.isScriptRecord && !$scope.task.isDistribute) {
                    DialogService.alert("当前网络异常无法继续录制!").then(function(){
                        // 前端收到device.lost，2次重连失败之后直接退出租用界面，不用请求Django的接口,TC会给Django发queueMessage同步脚本
                        $scope.notCompleteRecord = true;
                        $scope.completeTask(null, true);
                    })
                } else {
                    _abortExecutionAndCompleteTask();
                }
            },
            //租用到期
            'device.expire': function() {
                DialogService.alert("您的测试已到期!")
                    .then(function() {
                        _abortExecutionAndCompleteTask();
                    });
            },
            //用户停止当前租用
            'device.stopRent': function() {
                if (!$scope.quailStopRent) { //rio退租手机才提示
                    DialogService.error("您已停止租用该设备!").then(function() {
                        _abortExecutionAndCompleteTask();
                    });
                }
            },
            //租用即将到期（5分钟）
            'device.willExpire': function() {
                var CONFIRM_EXPIRE_TIME = 4 * 60 * 1000,
                    rentModalPromise;

                var task = $.extend(true, {}, $scope.task.isDistribute ? $scope.execution : $scope.task);

                TaskService[$scope.task.isDistribute ? "reletDistributeTask" : "reletTask"](task, {
                    ignoreSpinner: true,
                    responseError: function(rejection, originErrorHandler) {
                        if (rejection.status == 410) {
                            _expireWrapModal(_showRechargeModal(), CONFIRM_EXPIRE_TIME);
                            return $q.reject(rejection);
                        } else {
                            return originErrorHandler(rejection);
                        }
                    }
                });

                function _showRechargeModal() {

                    var modalInstance = $uibModal.open({
                        templateUrl: "apps/task/stf/templates/recharge.modal.html",
                        controller: "BalanceNotEnoughCtrl",
                        size: 'md',
                        resolve: {
                            result: function() {
                                return {};
                            }
                        }
                    });

                    modalInstance.result.then(function() {
                        TaskService[$scope.task.isDistribute ? "reletDistributeTask" : "reletTask"](task, {ignoreErrHandler: true, ignoreSpinner: true});
                    });
                    return modalInstance;

                }

                function _expireWrapModal(modalInstance, expireTimes) {
                    var isClosed = false;
                    if (expireTimes) {
                        modalInstance.result.finally(function() {
                            isClosed = true;
                        })
                        $timeout(function() {
                            if (!isClosed) {
                                modalInstance.dismiss();
                            }
                        }, expireTimes);
                    }
                    return modalInstance.result;
                }

            },
            //闲置超时
            'device.idle': function() {
                DialogService.alert("因为长时间没有操作，您的本次测试已经被终止")
                    .then(_abortExecutionAndCompleteTask);
            },
            //离开页面或关闭页面
            'page.unload': function() {
                var executionKeys = $scope.task.isDistribute ? [$scope.task.key] : [],
                    taskId = $scope.task.isDistribute ? $scope.task.task_id : $scope.task.id;

                // 用例录制调用新接口,但是当用例录制,execution还没创建时关闭页面还是调用原来的接口
                if ($scope.task.isScriptRecord && !$scope.task.isDistribute) {
                    $scope.quailStopRent = true;
                    // 关闭浏览器时,如果有截图则需要保存已经录制的截图
                    if ($scope.execution && $scope.execution.snapshots.length > 0) {
                        $scope.action = "complete";
                        TaskService.ajaxSyncCompleteRecord($scope.task.id, $scope.execution.id, $scope.action);
                    } else {
                        TaskService.ajaxSyncAbortRecord($scope.task.id, $scope.execution ? $scope.execution.id : undefined);
                    }
                } else {
                    TaskService.abortTask(taskId, executionKeys);
                }
            },
            //离开stf路由
            "leave.stf.state": function(opts) {
                if (!client.state.isUnrent) {
                    opts.event.preventDefault();
                    $scope.completeTask({
                        name: opts.toState.name,
                        params: opts.toParams
                    }).then(function() {
                        if ($scope.installInstance) {
                            $scope.installInstance.dismiss();
                        }
                        if ($scope.device) {
                            client.close();
                        }
                        //仅成功退出再清理listener
                        opts.removeListener();
                    });
                } else {
                    client.close();
                }
            }
        });

        function _installApp() {
            var DEMO_PACKAGE_NAME = 'com.testbird.demo.activityscenetransitionbasic',
                isDemoApp = ($scope.task.release.package_name == DEMO_PACKAGE_NAME);

            var installPromise = $q.when('');

            if (!isDemoApp) {
                $scope.installInstance = $uibModal.open({
                    templateUrl: 'apps/task/stf/install/install.modal.html',
                    backdrop: 'static',
                    size: 'md',
                    controller: 'InstallCtrl',
                    resolve: {
                        control: function() {
                            return $scope.control;
                        },
                        release: function() {
                            return $scope.task.release;
                        },
                        device: function() {
                            return $scope.task.device;
                        }
                    }
                });
                installPromise = $scope.installInstance.result;
            }

            return installPromise
                .then(function() {
                    return _launchApp();
                }, function(e) {
                    if (!client.state.isUnrent) {
                        $scope.completeTask(null, true);
                    }
                    return $q.reject(e);
                });

            function _launchApp() {
                //脚本录制任务，APP安装成功后，不再发送launch消息
                return ($scope.task.isScriptRecord ? $q.when("") : $scope.control.launch({
                    packageName: $scope.task.release.package_name,
                    activityName: $scope.task.release.main_activity
                })).then(function() {
                    //录制脚本时，应用启动成功则自动开始测试执行
                    if ($scope.task.isScriptRecord) {
                        $scope.startExecution();
                    }
                });
            }

        }

        function _abortExecutionAndCompleteTask(callback) {
            $scope.backendClosedWS = true;
            if ($scope.execution) {
                return $scope.clearExecution().then(function() {
                    return $scope.completeTask(null, true, false, callback);
                });
            } else {
                return $scope.completeTask(null, true, false, callback);
            }
        }

    }
}

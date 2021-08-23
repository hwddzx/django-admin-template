(function() {
    'use strict';

    angular.module('quail.main')
        .factory("TaskFactoryService", TaskFactoryService)
        .factory("DataService", DataService);

    function TaskFactoryService($http, $state, $filter, RentModalService, TaskService, TagService, UploadService, DialogService, TASK_ENUM, REPLAY_MODE, RENT_MODAL_STEP, LayoutService, RENT_TYPE) {

        var service = {
            createTask: createTask,
            createEmptyTask: createEmptyTask,
            createRecordTask: createRecordTask,
            createReplayTask: createReplayTask,
            createDialtestTask: createDialtestTask,
            createTaskWithParams: createTaskWithParams,
            createComptestTask: createComptestTask,
            addToComptestTask: addToComptestTask,
            createTaskWidthDeviceKey: createTaskWidthDeviceKey,
            createReplayTaskWidthDeviceKey: createReplayTaskWidthDeviceKey,
            createRecordTaskWidthDeviceKey: createRecordTaskWidthDeviceKey,
            rerunExecutions: rerunExecutions,
            getQiniuToken: getQiniuToken
        };

        return service;

        function createTask(app, deviceKey, type, scriptTestcase) {
            var task = {
                desc: '',
                type: type || TASK_ENUM.taskType.manual,
                device_key: deviceKey || undefined,
                scriptTestcase: scriptTestcase || undefined
            };
            RentModalService.open({
                    task: task,
                    app: app,
                    //scriptTestcase存在表示是"录制脚本",录制的是当前脚本,不需要选择用例
                    needTestcase: !scriptTestcase && (task.type == TASK_ENUM.taskType.record || task.type == TASK_ENUM.taskType.manual),
                    needChooseDevice: task.type == TASK_ENUM.taskType.manual || task.type == TASK_ENUM.taskType.record,
                    rentType: task.type == TASK_ENUM.taskType.manual ? RENT_TYPE.domestic : undefined
                })
                .then(function() {
                    task.originName = app.name;
                    TaskService.createTask(task.release.id, task)
                        .then(function(data) {
                            LayoutService.setHost('http://' + data.device.public_ip + ':' + data.device.port);
                            $state.go("stf", {
                                app: app,
                                task: _.extend(task, data, { remainTime: task.duration }),
                                appKey: app.key,
                                taskType: task.type
                            });
                        });
                });
        }

        function createEmptyTask(app) {
            var date = $filter('date')(new Date().getTime(), "yyyy-MM-dd");
            var task = {
                name: '补测' + '(' + date + ')',
                desc: ''
            };
            return RentModalService.open({
                task: task,
                app: app
            }).then(function() {
                return TaskService.createEmptyTask(task.release.id, task);
            }).then(function(taskId) {
                return DialogService.alert('创建成功，id为：' + taskId);
            });
        }

        function createRecordTask(app, scriptTestcase) {
            service.createTask(app, null, TASK_ENUM.taskType.record, [_.pick(scriptTestcase, 'id', 'name')]);
        }

        function createTaskWithParams(replayMode, app, file) {
            UploadService.upload(file, UploadService.getFileKey(file, "config")).then(function(url) {
                if (replayMode === REPLAY_MODE.comptest) {
                    return service.createComptestTask(app, undefined, url);
                } else {
                    return service.createReplayTask(app, undefined, replayMode, undefined, url);
                }
            });
        }

        function createComptestTask(app, deviceKey, url) {

            var options = {
                task: {
                    device_key: deviceKey || undefined,
                    type: TASK_ENUM.taskType.replay,
                    configUrl: url,
                    desc: ''
                },
                app: app,
                replayMode: REPLAY_MODE.comptest,
                needTestcase: true,
                hideTimes: false,
                hasScript: true,
                hideAccountInfo: true,
                needChooseDevice: true,
                singleTestCaseSelect: true,
                rentType: RENT_TYPE.replay
            };

            var task = options.task;

            RentModalService.open(options)
                .then(function() {
                    $state.go("^.compteststf");
                    TaskService.createReplayTaskV3(task.release.id, task).then(function () {
                        $state.go(task.scheduleTime ? "^.timedComptesttasks" : "^.comptesttasks");
                    }).catch(function() {
                        $state.go(task.scheduleTime ? "^.timedComptesttasks" : "^.comptesttasks");
                    });
                });
        }

        function addToComptestTask(app, taskId, isTimedTask) {

            var options = {
                task: {
                    device_key: undefined,
                    type: TASK_ENUM.taskType.replay,
                    desc: ''
                },
                app: app,
                step: RENT_MODAL_STEP.chooseDevice,
                replayMode: REPLAY_MODE.comptest,
                needChooseDevice: true,
                rentType: RENT_TYPE.replay,
                notUsedInTask: taskId
            };

            var task = options.task;

            RentModalService.open(options)
                .then(function() {
                    $state.go("^.compteststf");

                    TaskService.addToReplayTask(task, taskId).then(function() {
                        $state.go(isTimedTask ? "^.timedComptesttasks" : "^.comptesttasks"); // task.sschedule_time存在表示定时任务
                    }).catch(function() {
                        $state.go(isTimedTask ? "^.timedComptesttasks" : "^.comptesttasks");
                    });
                });
        }

        function createReplayTask(app, deviceKey, replayMode, options, url) {

            options = _.extend({
                task: {
                    device_key: deviceKey || undefined,
                    type: TASK_ENUM.taskType.replay,
                    desc: '',
                    configUrl: url
                },
                app: app,
                needTestcase: true,
                hideTimes: true,
                hasScript: true,
                hideAccountInfo: true,
                needChooseDevice: replayMode == REPLAY_MODE.text,
                replayMode: replayMode,
                rentType: RENT_TYPE.replay
            }, options);

            var task = options.task;

            RentModalService.open(options)
                .then(function() {
                    $state.go("^.replaystf");
                    TaskService.createReplayTaskV3(task.release.id, task)
                        .then(function() {
                            $state.go(task.scheduleTime ? "^.timedReplaytasks" : "^.replaytasks"); // task.scheduleTime存在表示定时任务
                        })
                        .catch(function() {
                            $state.go(task.scheduleTime ? "^.timedReplaytasks" : "^.replaytasks");
                        });
                });
        }

        function createDialtestTask(app, replayMode, deviceKey, url) {
            var options = _.extend({
                task: {
                    device_key: deviceKey || undefined,
                    type: TASK_ENUM.taskType.replay,
                    sub_replay_type: 1,
                    desc: '',
                    configUrl: url
                },
                app: app,
                needTestcase: true,
                hideTimes: true,
                hasScript: true,
                hideAccountInfo: true,
                needChooseDevice: true,
                replayMode: REPLAY_MODE.text,
                rentType: RENT_TYPE.replay
            }, options);

            var task = options.task;

            RentModalService.open(options)
                .then(function() {
                    $state.go("^.replaystf");
                    TaskService.createReplayTaskV3(task.release.id, task)
                        .then(function() {
                            $state.go("^.dialtesttasks");
                        })
                        .catch(function() {
                            $state.go("^.dialtesttasks");
                        });
                });
        }

        function createTaskWidthDeviceKey(app) {
            var deviceKey = prompt("请输入设备key:");
            if (deviceKey) {
                service.createTask(app, deviceKey);
            }
        }

        function createReplayTaskWidthDeviceKey(app) {
            var deviceKey = prompt("请输入设备key:");
            if (deviceKey) {
                service.createReplayTask(app, deviceKey);
            }
        }

        function createRecordTaskWidthDeviceKey(app) {
            var deviceKey = prompt("请输入设备key:");
            if (deviceKey) {
                service.createTask(app, deviceKey, TASK_ENUM.taskType.record);
            }
        }

        function rerunExecutions(app, task, executions, step, devices) {
            createReplayTask(app, undefined, REPLAY_MODE.text, {
                task: {
                    device_key: undefined,
                    device: devices,
                    type: TASK_ENUM.taskType.replay,
                    desc: '',
                    testcases: _.map(executions, function(e) {
                        return {
                            id: e.testcase_id,
                            name: e.name
                        }
                    }),
                    release_build: task.release_build,
                    schedule_mode: task.schedule_mode
                },
                step: step || RENT_MODAL_STEP.chooseDevice
            });
        }

        function getQiniuToken() {
            return $http.get('/api/app/uptoken/build/').then(function (res) {
                var data = res.data ? res.data : res;
                var tokens = {};
                tokens.other = {domain: data.domain, uptoken: data.uptoken};
                tokens.app = {domain: data.app_domain, uptoken: data.app_uptoken};
                if (!tokens.app.domain) {
                    tokens.app = tokens.other;
                }
                return tokens;
            });
        }

    }

    function DataService($http, FileService) {
        return {
            crossGet: crossGet,
            download: download,
            downloadByUrl: downloadByUrl,
            getDifferentStr: getDifferentStr
        };

        function crossGet(url, params) {
            return $http.get(url, _.merge({
                withCredentials: false,
                headers: {
                    'Content-Type': undefined,
                    'Authorization': undefined,
                    'Token': undefined
                }
            }, params)).then(function(res) {
                return res.data;
            });
        }

        function download(api) {
            return $http.get(api).then(function(res) {
                return FileService.downloadByUrl(res.data);
            });
        }

        function downloadByUrl(url) {
            return FileService.downloadByUrl(url);
        }

        /**
         * 用于通过编号形式获取与现有字段不同的字段
         *  接受两种形式：
         *  1、arr为str的结合
         *  2、arr为中一个字段为目标str
         */
        function getDifferentStr(arr, baseStr, key) {
            var count = 1,
                newStr,
                strs = key ? _.map(arr, key) : arr;
            while( strs.indexOf(newStr = baseStr + count) > -1) {
                count ++;
            }
            return newStr;
        }
    }

})();

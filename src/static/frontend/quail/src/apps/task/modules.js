(function() {
    angular.module('quail.task', ['control-panes', 'quail.layout'])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state("app.tasks", {
                url: "/tasks",
                templateUrl: 'apps/task/templates/tasks.html',
                controller: 'TasksCtrl',
                params: {
                    clearFilter: false
                }
            }).state("stf", {
                url: "/device/control/:appKey/:taskType/",
                templateUrl: 'apps/task/stf/templates/stf.html',
                controller: 'ControlPanesCtrl',
                params: {
                    app: "",
                    task: ""
                }
            }).state("app.task", {
                url: "/task/:taskId/",
                templateUrl: 'apps/task/templates/task.detail.html',
                controller: 'TaskCtrl',
                controllerAs: 'vm',
                resolve: {
                    replay: function() {
                        return false;
                    }
                }
            }).state("app.task_choose_executions", {
                url: "/task_choose_executions/:ids",
                templateUrl: 'apps/task/templates/task.choose.executions.html',
                controller: 'TaskChooseExecutionsCtrl',
                resolve: {
                    executions: function($stateParams, TaskService) {
                        return TaskService.getTaskExecutions($stateParams.key, $stateParams.ids);
                    },
                    isReplay: function() {
                        return false;
                    }
                }
            });
        }])
        .constant("TASK_ENUM", {
            defaultDuration: 10800,
            executionResult: {
                failed: -1,
                blocked: 0,
                passed: 1
            },
            executionSeverity: {
                fatal: 0,
                critical: 10,
                normal: 20,
                minor: 30
            },
            taskType: {
                manual: 0,
                record: 1,
                replay: 2
            },
            executionStatus: {
                start: 0,   //??????????????????????????????????????????
                waiting: 1, //????????????
                queue: 3,
                pending: 5,
                complete: 10,
                uploaded: 20
            },
            subReplayType: {
                normal: 0,
                dialtest: 1
            }
        })
        .constant("REPLAY_MODE", {
            oldInitValue: 0, // ??????????????????
            image: 1,
            text: 2,
            monkey: 3,
            comptest: 4
        })
        .constant("SCHEDULE_MODE", {
            share: 1,
            "private": 2
        })
        .constant("EDIT_MODE", {
            list_result_mode: 0,
            snapshot_result_mode: 1
        })
        .constant("RETEST_TYPE", {
            batch: 0, // ????????????
            params: 1, // ????????????
            file: 2, //??????????????????
            rerun: 3, //????????????
            replay: 4, //???????????????????????????????????????????????????????????????
        })
        .run(function($rootScope, TaskService) {
            $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams) {
                if (toState.name === 'app.tasks' && toParams.clearFilter) {
                    TaskService.taskFilter = null;
                }
                if (toParams.clearFilter) {
                    TaskService.replayFilter = null;
                }
            });
        });

})();

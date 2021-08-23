(function() {
    angular.module('quail.task.replay', ['control-panes'])
        .config(['$stateProvider', function($stateProvider) {
            // 自动回归测试
            $stateProvider.state("app.replaytasks", {
                    url: "/replaytasks",
                    templateUrl: 'apps/task/replay/templates/replays.html',
                    controller: 'ReplaysCtrl',
                    params: {
                        clearFilter: true
                    }
                })
                // 兼容性测试
                .state("app.comptesttasks", {
                    url: "/comptest/comptesttasks",
                    templateUrl: 'apps/task/replay/templates/comptests.html',
                    controller: 'ReplaysCtrl',
                    params: {
                        clearFilter: true
                    }
                })
                // 拨测回归测试
                .state("app.dialtesttasks", {
                    url: "/dialtesttasks",
                    templateUrl: 'apps/task/replay/templates/dialtests.html',
                    controller: 'ReplaysCtrl',
                    params: {
                        clearFilter: true
                    }
                })
                // 定时自动回归测试
                .state("app.timedReplaytasks", {
                    url: "/timedReplaytasks",
                    templateUrl: 'apps/task/replay/templates/replays.html',
                    controller: 'ReplaysCtrl',
                    params: {
                        clearFilter: true
                    }
                })
                // 定时兼容性测试
                .state("app.timedComptesttasks", {
                    url: "/timedComptesttasks",
                    templateUrl: 'apps/task/replay/templates/comptests.html',
                    controller: 'ReplaysCtrl',
                    params: {
                        clearFilter: true
                    }
                })
                //拨测回归详情
                .state("app.dialtesttask", {
                    url: "/dialtesttask/:taskId/:progress",
                    templateUrl: 'apps/task/replay/templates/dialtest.detail.html',
                    controller: 'TaskCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        replay: function($stateParams, TaskService) {
                            return TaskService.getTask($stateParams.taskId);
                        }
                    }
                })
                .state("app.replaytask", {
                    url: "/replaytask/:taskId/:progress",
                    templateUrl: 'apps/task/replay/templates/replay.detail.html',
                    controller: 'TaskCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        replay: function($stateParams, TaskService) {
                            return TaskService.getTask($stateParams.taskId);
                        }
                    }
                })
                //定时回归任务详情，html与controller相同，只是路由不同，避免左侧菜单栏高亮错误
                .state("app.timedReplaytask", {
                    url: "/timedReplaytask/:taskId/:progress",
                    templateUrl: 'apps/task/replay/templates/replay.detail.html',
                    controller: 'TaskCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        replay: function($stateParams, TaskService) {
                            return TaskService.getTask($stateParams.taskId);
                        }
                    }
                })
                .state("app.comptesttask", {
                    url: "/comptesttask/:taskId/:progress/:appType",
                    templateUrl: 'apps/task/replay/templates/comptest.detail.html',
                    controller: 'TaskCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        replay: function($stateParams, TaskService) {
                            return TaskService.getTask($stateParams.taskId);
                        }
                    }
                })
                //定时兼容性详情，html与controller相同，只是路由不同，避免左侧菜单栏高亮错误
                .state("app.timedComptesttask", {
                    url: "/timedComptesttask/:taskId/:progress/:appType",
                    templateUrl: 'apps/task/replay/templates/comptest.detail.html',
                    controller: 'TaskCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        replay: function($stateParams, TaskService) {
                            return TaskService.getTask($stateParams.taskId);
                        }
                    }
                })
                .state("app.replaystf", {
                    url: "/replay/",
                    templateUrl: 'apps/task/replay/templates/replay.stf.html'
                })
                .state("app.compteststf", {
                    url: "/comptest/",
                    templateUrl: 'apps/task/replay/templates/comptest.stf.html'
                })
                .state("app.replaychooseexecutions", {
                    url: "/replaychooseexecutions/:ids",
                    templateUrl: 'apps/task/templates/task.choose.executions.html',
                    controller: 'TaskChooseExecutionsCtrl',
                    resolve: {
                        executions: function($stateParams, ExecutionService) {
                            return ExecutionService.getTaskExecutions($stateParams.key, $stateParams.ids);
                        },
                        isReplay: function() {
                            return true;
                        }
                    }
                })
                .state("app.timedReplaytaskchooseexecutions", {
                    url: "/timedReplaytaskchooseexecutions/:ids",
                    templateUrl: 'apps/task/templates/task.choose.executions.html',
                    controller: 'TaskChooseExecutionsCtrl',
                    resolve: {
                        executions: function($stateParams, ExecutionService) {
                            return ExecutionService.getTaskExecutions($stateParams.key, $stateParams.ids);
                        },
                        isReplay: function() {
                            return true;
                        }
                    }
                });
        }])
})();

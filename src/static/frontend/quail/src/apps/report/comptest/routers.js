(function() {

    angular.module('report_v2')
        .config(routeConfig);

    function routeConfig($stateProvider) {
        $stateProvider
            .state("report_v2", {
                url: "/report_v2/:key",
                title: "测试报告",
                target: "Report",
                templateUrl: "apps/report/comptest/index.html",
                controller: "reportCtrlV2",
                controllerAs: "vm",
                resolve: {
                    overview: function($stateParams, reportV2Service, config) {
                        return reportV2Service.getOverview($stateParams.key).then(function(res) {
                            config.dataVersion = res.data_version;
                            return res;
                        });
                    },
                    compatibility: function($stateParams, reportV2Service) {
                        return reportV2Service.getCompatibility($stateParams.key);
                    },
                    performance: function($stateParams, reportV2Service) {
                        return reportV2Service.getPerformance($stateParams.key);
                    }
                }
            })
            .state("report_v2.compatibility", {
                url: "/compatibility",
                title: "兼容性分析",
                target: "Compatibility",
                templateUrl: "apps/report/comptest/compatibility/index.html",
                controller: "reportCompatibilityCtrlV2",
                controllerAs: "vm",
                resolve: {
                    subtasks: function($stateParams, reportV2Service) {
                        return reportV2Service.getSubtasks($stateParams.key);
                    }
                }
            })
            .state("report_v2.performance", {
                url: "/performance",
                title: "性能分析",
                target: "Performance",
                templateUrl: "apps/report/comptest/performance/index.html",
                controller: "reportPerformanceCtrlV2",
                controllerAs: "vm"
            })
            .state("report_v2.exceptions", {
                url: "/exceptions",
                title: "问题定位",
                target: "Exceptions",
                templateUrl: "apps/report/comptest/exceptions/index.html",
                controller: "reportExceptionsCtrl",
                controllerAs: "vm",
                resolve: {
                    subtasks: function($stateParams, reportV2Service) {
                        return reportV2Service.getSubtasks($stateParams.key);
                    }
                }
            })
            .state("report_v2.subtasks", {
                url: "/subtasks",
                title: "终端列表",
                target: "Subtasks",
                templateUrl: "apps/report/comptest/subtasks/index.html",
                controller: "reportSubtasksCtrl",
                controllerAs: "vm",
                resolve: {
                    subtasks: function($stateParams, reportV2Service) {
                        return reportV2Service.getSubtasks($stateParams.key);
                    }
                }
            })
            .state("subtaskDetail", {
                url: "/:taskKey/subtask_detail/:subtaskKey",
                title: "报告详情",
                target: "subtaskDetail",
                templateUrl: "apps/report/comptest/subtask_detail/templates/index.html",
                controller: "subtaskDetailCtrl",
                controllerAs: "vm",
                resolve: {
                    subtasks: function($stateParams, reportV2Service) {
                        return reportV2Service.getSubtasks($stateParams.taskKey).then(function(res) {
                            return res.subtasks;
                        });
                    },
                    subtaskDetail: function($stateParams, reportV2Service){
                        return reportV2Service.getSubtaskDetail($stateParams.subtaskKey);
                    }
                }
            })
            .state("subtaskDetail.performance", {
                url: "/performance",
                title: "性能分析",
                target: "Performance",
                templateUrl: "apps/report/comptest/subtask_detail/templates/performance.html",
                controller: "performanceCtrl",
                controllerAs: "vm"
            })
            .state("subtaskDetail.logs", {
                url: "/logs/:scrollToLog",
                title: "日志分析",
                target: "Logs",
                templateUrl: "apps/report/comptest/subtask_detail/templates/logs.html",
                controller: "logsCtrl",
                controllerAs: "vm",
                params: {
                    isGoToExceptionLogLine: false
                }
            })
            .state("subtaskDetail.profile", {
                url: "/profile",
                title: "设备参数",
                target: "Profile",
                templateUrl: "apps/report/comptest/subtask_detail/templates/profile.html"
            })
            .state("subtaskDetail.snapshots", {
                url: "/snapshots",
                title: "所有截图",
                target: "Snapshots",
                templateUrl: "apps/report/comptest/subtask_detail/templates/snapshots.html"
            })
    }

})();

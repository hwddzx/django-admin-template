(function() {
    angular.module('quail.report', [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state("app.reports", {
                url: "/reports",
                templateUrl: 'apps/report/templates/reports.html',
                controller: 'ReportsCtrl'
            }).state("reportDetail", {
                url: '/reportDetail/:hashkey',
                templateUrl: 'apps/report/detail/templates/report.detail.html',
                controller: 'ReportDetailCtrl',
                resolve: {
                    reportDetail: function($stateParams, ReportDetailService) {
                        return ReportDetailService.getReportDetail($stateParams.hashkey);
                    },
                    executions: function($stateParams, ReportDetailService) {
                        return ReportDetailService.getExecutions($stateParams.hashkey);
                    }
                }

            }).state("executionDetail", {
                url: '/executionDetail/:hashkey/:canChangeCompare',
                templateUrl: 'apps/report/execution-detail/templates/execution.detail.html',
                controller: 'ExecutionDetailCtrl',
                controllerAs: "vm",
                resolve: {
                    executionDetail: function($stateParams, ExecutionDetailService) {
                        return ExecutionDetailService.getExecutionDetail($stateParams.hashkey);
                    },
                    sysConfig: function(ExecutionDetailService) {
                        return ExecutionDetailService.getSysConfig();
                    }
                }
            }).state("dialtestOverview", {
                url: '/dialtest/:appKey/overview/',
                templateUrl: 'apps/report/dialtest/templates/dialtest.overview.html',
                controller: 'DialtestOverviewCtrl',
                controllerAs: "vm",
                resolve: {
                    overview: function($stateParams, DialtestService) {
                        return DialtestService.getDialtestOverview($stateParams.appKey);
                    }
                }
            }).state("dialtestDatacheck", {
                url: '/dialtest/:appKey/datacheck/:startDate',
                templateUrl: 'apps/report/dialtest/templates/dialtest.datacheck.html',
                controller: 'DialtestDatacheckCtrl',
                controllerAs: "vm",
                resolve: {
                    overview: function($stateParams, DialtestService) {
                        return DialtestService.getDialtestOverview($stateParams.appKey, {start_date: $stateParams.startDate});
                    },
                    datacheckSummary: function($stateParams, DialtestService) {
                        return DialtestService.getDatacheckSummary($stateParams.appKey, {start_date: $stateParams.startDate});
                    }
                }
            }).state("dialtestFunctest", {
                url: '/dialtest/:appKey/functest/:startDate',
                templateUrl: 'apps/report/dialtest/templates/dialtest.functest.html',
                controller: 'DialtestFunctestCtrl',
                controllerAs: "vm",
                resolve: {
                    overview: function($stateParams, DialtestService) {
                        return DialtestService.getDialtestOverview($stateParams.appKey, {start_date: $stateParams.startDate});
                    },
                    functestSummary: function($stateParams, DialtestService) {
                        return DialtestService.getFunctestSummary($stateParams.appKey, {start_date: $stateParams.startDate});
                    }
                }
            }).state("dialtestTables", {
                url: '/dialtest/:appKey/tables/',
                templateUrl: 'apps/report/dialtest/templates/dialtest.tables.html',
                controller: 'DialtestTablesCtrl',
                controllerAs: "vm",
                resolve: {
                    overview: function($stateParams, DialtestService) {
                        return DialtestService.getDialtestOverview($stateParams.appKey);
                    },
                    tableOverview: function($stateParams, DialtestService) {
                        return DialtestService.getTableOverview($stateParams.appKey);
                    }
                }
            });
        }])
        .constant("DIALTEST_ENUM", {
            KeyWordFilter: ['key', 'scenario', 'testcase_name', 'variable_display_name', 'name', 'result']
        });
})();

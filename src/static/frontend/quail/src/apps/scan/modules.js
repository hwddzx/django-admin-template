(function () {
    angular.module("scan", [])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider.state("app.scantasks", {
                url: "/scantasks/",
                templateUrl: "apps/scan/templates/scantasks.html",
                controller: "ScantasksController",
                controllerAs: "vm",
                resolve: {
                    sensitiveItems: function(ScanService) {
                        return ScanService.getSensitiveItems();
                    }
                }
            }).state("app.scanExecutions", {
                url: "/scanExecutions/:scantaskKey/:scantaskName",
                templateUrl: "apps/scan/templates/scan.executions.html",
                controller: "ScanExcutionsController",
                controllerAs: "vm",
                resolve: {
                    scanExecutions: function($stateParams, ScanService) {
                        return ScanService.getScanExecutions($stateParams.scantaskKey);
                    }
                }
            }).state("scanDetail", {
                url: "/scanDetail/:executionKey/",
                templateUrl: "apps/scan/templates/scan.detail.html",
                controller: "ScanDetailController",
                controllerAs: "vm",
                resolve: {
                    scanDetail: function($stateParams, ScanService) {
                        return ScanService.getScanDetail($stateParams.executionKey, {});
                    }
                }
            });
        }])
        .constant("SCAN_ENUM", {
            scanType: {
                sensitive: 0,  //敏感词
                safe: 1      //三方库安全
            },
            limitExecutionCount: 4,
            executionStatus: {
                stop: 0,
                wait: 4,  //排队
                run: 5,
                complete: 10
            },
            severity: {
                low: 'Low',
                medium: 'Medium',
                high: 'High'
            }
        });
})();
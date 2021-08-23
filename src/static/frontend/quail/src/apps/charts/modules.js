(function() {
    angular.module("charts", [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider
                .state("app.charts", {
                    url: "/charts/:appKey/",
                    templateUrl: "apps/charts/templates/index.html",
                    controller: "ChartsController",
                    controllerAs: "vm",
                    resolve: {
                        versions: function($stateParams, ReleaseService) {
                            return ReleaseService.getReleases($stateParams.appKey);
                        },
                        scenarios: function($stateParams,TestCaseService, ChartsService) {
                            return TestCaseService.getTestCases($stateParams.appKey).then(function(res) {
                                return ChartsService.getScenarios(res);
                            });
                        },
                        overview: function($stateParams, ChartsService) {
                            return ChartsService.getChartOverview($stateParams.appKey);
                        },
                        chartDetail: function($stateParams, ChartsService) {
                            return ChartsService.getChartDetail($stateParams.appKey);
                        }
                    }
                });
        }]);
})();
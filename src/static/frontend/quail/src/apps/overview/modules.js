(function() {
    angular.module("overview", [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider
                .state("overview", {
                    url: "/overview/:appKey/",
                    templateUrl: "apps/overview/templates/index.html",
                    controller: "OverviewController",
                    controllerAs: "vm",
                    resolve: {
                        versions: function($stateParams, ReleaseService) {
                            return ReleaseService.getReleases($stateParams.appKey);
                        },
                        overview: function($q, $stateParams, config, OverviewService) {
                            var params = $stateParams.dateStr || "";
                            return OverviewService.getAppOverview($stateParams.appKey, {start_date: params.start_date, end_date: params.end_date});
                        }
                    },
                    params: {
                        date: "",
                        dateStr: ""
                    }
                })
        }])
})();
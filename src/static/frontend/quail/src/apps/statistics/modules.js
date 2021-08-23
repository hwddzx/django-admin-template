(function() {
    angular.module("statistics", [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider
                .state("app.statistics", {
                    url: "/statistics/:appKey/",
                    templateUrl: "apps/statistics/templates/index.html",
                    controller: "StatisticsController",
                    controllerAs: "vm"
                });
        }]);
})();
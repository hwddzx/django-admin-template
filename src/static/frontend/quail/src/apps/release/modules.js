(function() {
    angular.module('quail.release', [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state("app.releases", {
                url: "/releases",
                templateUrl: 'apps/release/templates/releases.html',
                controller: 'ReleasesCtrl',
                resolve: {
                    releases: function($stateParams, ReleaseService) {
                        return ReleaseService.getReleases($stateParams.key);
                    }
                }
            });
        }]);
})();

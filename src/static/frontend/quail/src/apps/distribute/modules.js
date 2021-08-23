(function() {
    angular.module("distribute", [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider
                .state("app.distribute", {
                    url: "/distribute",
                    templateUrl: "apps/distribute/templates/index.html",
                    controller: "DistributeCtrl",
                    controllerAs: "vm",
                    resolve: {
                        appInfo: function($stateParams, DistributeService) {
                            return DistributeService.getAppInfo($stateParams.key).then(function(data){
                                return data;
                            });
                        },
                        releases: function($stateParams, ReleaseService) {
                            return ReleaseService.getReleases($stateParams.key).then(function(releases){
                                return releases;
                            });
                        }

                    }
                })
                .state("app.distribute-member-manage", {
                    url: "/distribute-member-manage",
                    templateUrl: "apps/distribute/templates/member.manage.html",
                    controller: "MemberManagementCtrl",
                    controllerAs: "vm",
                    resolve: {
                        appInfo: function($stateParams, DistributeService) {
                            return DistributeService.getAppInfo($stateParams.key).then(function(data){
                                return data;
                            });
                        }
                    }
                })
        }])
})();
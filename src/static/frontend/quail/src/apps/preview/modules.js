(function() {
    angular.module("preview", [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider
                .state("preview", {
                    url: "/preview/:appKey",
                    templateUrl: "apps/preview/templates/index.html",
                    controller: "PreviewController",
                    controllerAs: "vm",
                    resolve: {
                        userList: function($stateParams, PermissionService) {
                            return PermissionService.getUserList($stateParams.appKey).then(function(data) {
                                return data;
                            });
                        },
                        preview: function($q, $stateParams, PreviewService) {
                            return PreviewService.getUserPreview($stateParams.appKey);
                        }
                    }
                })
        }])
})();
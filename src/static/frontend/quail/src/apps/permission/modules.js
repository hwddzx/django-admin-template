(function() {
    angular.module("permission", [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider
                .state("app.permission", {
                    url: "/permission",
                    templateUrl: "apps/permission/templates/index.html",
                    controller: "PermissionController",
                    controllerAs: "vm",
                    resolve: {
                        allUser: function($stateParams, PermissionService) {
                            return PermissionService.getAllUser().then(function(data) {
                                return data;
                            });
                        },
                        userList: function($stateParams, PermissionService) {
                            return PermissionService.getUserList($stateParams.key).then(function(data) {
                                return data;
                            });
                        }
                    }
                })
        }])
})();
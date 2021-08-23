(function() {
    angular.module('quail.app', [])
        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state("apps", {
                url: "/apps",
                params: {"tabType": null},
                templateUrl: 'apps/app/templates/apps.html',
                controller: 'AppsCtrl',
                resolve: {
                    appsProgress: function($q, AppService, config) {
                        if (config.is_manager || config.is_supervisor) {
                            return AppService.getAppsProgress();
                        }
                        return $q.when();
                    },
                    apps: function(AppService) {
                        return AppService.getAppList();
                    },
                    allCustomer: function($q, PermissionService, config) {
                        if (config.is_manager) {
                            return PermissionService.getAllUser();
                        }
                        return $q.when();
                    },
                    customers: function($q, AppService, config) {
                        if (config.is_manager) {
                            return AppService.getCustomerList();
                        }
                        return $q.when();
                    }
                }
            }).state("app", {
                url: "/app/:key",
                templateUrl: 'apps/app/templates/app.html',
                controller: 'AppCtrl',
                resolve: {
                    apps: function(AppService) {
                        return AppService.getAppList();
                    }
                }
            }).state("performance", {
                url: "/performance/:key",
                templateUrl: 'apps/app/templates/performance.detail.html',
                controller: 'PerformanceComparisonDetailCtrl',
                controllerAs: "vm",
                resolve: {
                    compareReportDetail: function(AppService, $stateParams) {
                        return AppService.getCompareReportDetail($stateParams.key);
                    },
                    detailId: function ($stateParams) {
                        return $stateParams.key
                    }
                }
            });
        }])
        .constant("MONITOR_ENUM", {
            deviceKeyWordFilter: ['app_name', 'name', 'locker', 'key']
        });
})();

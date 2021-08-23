angular.module('device-list', [
        'stf.device',
        'stf.control',
        'stf.upload',
        'stf.rent-modal',
        'stf.table',
        'stf.device-filters'
    ])
    .config(['$stateProvider', function($stateProvider) {
        $stateProvider.state("devices", {
            url: "/devices",
            templateUrl: 'app/device-list/templates/device-list.html',
            controller: 'DeviceListCtrl',
            resolve: {
                customer: function(RioService) {
                    return RioService.getCustomerInfo();
                },
                sysConfig: function(RioService,$q) {
                    return RioService.getSysConfig();
                }
            }
        });

    }]);

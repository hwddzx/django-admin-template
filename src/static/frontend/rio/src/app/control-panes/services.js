(function() {

    angular.module('control-panes')
        .factory("DeviceDataService", DeviceDataService);

    function DeviceDataService($rootScope, RioService, $q, $http, $uibModal, $state, config) {

        var cache = {};

        return {
            getCacheData: function(serial) {
                serial = serial || RioService.getCurrentRioDevice().serial;
                return cache[serial] || (cache[serial] = {
                    command: '',
                    result: '',
                    screenshots: []
                });
            },
            clearCacheData: function(serial) {
                delete cache[serial];
            }
        }

    }


}());

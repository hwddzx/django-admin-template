angular.module('control-panes', [
        'stf.logs',
        'stf.shell',
        'stf.install',
        'stf.info',
        'stf.video',
        'stf.logcat',
        'stf.popover',
        'stf.photo',
        'device-control'
    ])
    .config(['$stateProvider', function($stateProvider) {
        $stateProvider.state("device", {
            url: "/control/:key",
            templateUrl: 'app/control-panes/templates/control-panes.html',
            controller: 'ControlPanesCtrl',
            resolve: {
                rioDevice: function(RioService, $location, $stateParams, $state, $q, $timeout) {
                    return RioService.rent({
                        key: $stateParams.key
                    }).catch(function(rejection) {
                        if ($state.current.name !== 'devices') {
                            $state.go("devices");
                        }
                        if(rejection.data.errorMsg[0] == '该设备已被其他用户租用！'){
                            $state.reload();
                        }
                        return $q.reject(rejection);
                    });
                }
            },
            onExit: function($location) {
                $location.search("key", "");
            }
        });
    }]);

angular.module('stf.info').controller('InfoCtrl', InfoCtrl);

function InfoCtrl($scope, RioService) {

    $scope.$on("device:apply", function() {
        setTimeout(function() {
            $scope.$apply()
        });
    })

    $scope.$on("reload:device:runtime", function() {
        RioService.updateDeviceRuntimeInfo($scope.device);
    });

    $scope.openDevicePhoto = function(device) {
        // var title = device.name
        // var enhancedPhoto800 = '/static/app/devices/photo/x800/' + device.image
        // LightboxImageService.open(title, enhancedPhoto800)
    }

    var getSdStatus = function() {
        if ($scope.control) {
            $scope.control.getSdStatus().then(function(result) {
                $scope.$apply(function() {
                    $scope.sdCardMounted = (result.lastData === 'sd_mounted')
                })
            })
        }
    }
    getSdStatus()
}

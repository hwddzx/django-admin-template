angular.module('device-control')
    .controller("ScreenControlCtrl", ScreenControlCtrl);

function ScreenControlCtrl($rootScope, $scope) {

    $scope.isScreenLocked = false;
    $scope.isScreenshoting = false;

    //设备重连成功后，重设locked状态
    $scope.$on("reconnect:screen:socket",function(){
        $scope.isScreenLocked = false;
    });

    //清晰度范围:－5～5,默认值为0
    $scope.quality = 0;

    $scope.press = function(key) {
        $scope.control.keyPress($scope.isScreenLocked ? 'powerOn' : 'powerOff');
        $scope.isScreenLocked = !$scope.isScreenLocked;
    };

    $scope.screenshot = {
        steps: 1,
        multi: false
    };

    var listenerStartScreenshot= $rootScope.$on("start:screenshot",function(){
        $scope.isScreenshoting = true;
    })

    var listenerEndScreenshot = $rootScope.$on("end:screenshot",function(){
        $scope.isScreenshoting = false;
    })

    $scope.onQualityChanged = _.debounce(function() {
        $rootScope.$broadcast("quality:changed", $scope.quality);
    }, 1000);

    $scope.toggleShowSteps = function() {
        $scope.showSteps = !$scope.showSteps;
    }

    var canScreenshot = true;
    $scope.startScreenshot = function() {
        if (canScreenshot) {
            canScreenshot = false;
            $scope.screenshot.steps = $scope.screenshot.steps || 1;
            if ($scope.screenshot.steps > 50) {
                $scope.screenshot.steps = 50;
            }
            if (!$scope.screenshot.multi) {
                $scope.screenshot.steps = 1;
            }

            $rootScope.$broadcast("screenshot", $scope.screenshot);
        }
    }


    var listenerAddScreenshot = $rootScope.$on("add:screenshot",function(){
        canScreenshot = true;
    })

    $scope.$on('$destroy', function () {
        listenerStartScreenshot();
        listenerEndScreenshot();
        listenerAddScreenshot();
    })
}

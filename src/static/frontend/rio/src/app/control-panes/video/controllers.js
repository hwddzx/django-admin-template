angular.module('stf.video').controller('VideoCtrl', VideoCtrl);


function VideoCtrl($rootScope, $scope, $interval, DeviceDataService) {
    var SINGLE_SHOT_DELAY = 10,
        MULTI_SHOT_DELAY = 1000;
    $scope.data = DeviceDataService.getCacheData();
    // $scope.screenshots = []
    $scope.screenShotSize = 80
    $scope.capturePromise = null
    $scope.maxScreenshots = 50
    $scope.imageWidth = 300;

    $scope.clear = function() {
        $scope.data.screenshots = []
        $scope.style.width = 0;
    }

    $scope.style = {
        width: 0
    };

    var listenerScreenshot = $rootScope.$on("screenshot", function(event, screenshot) {
        $scope.takeScreenShotContinous(screenshot);
    })

    $scope.shotSizeParameter = function(maxSize, multiplier) {
        var finalSize = $scope.screenShotSize * multiplier
        var finalMaxSize = maxSize * multiplier

        return (finalSize === finalMaxSize) ? '' :
            '?crop=' + finalSize + 'x'
    }

    $scope.takeScreenShot = function(screenshot) {
        $scope.control.screenshot().then(function(result) {
            $scope.$apply(function() {
                $scope.data.screenshots.unshift(result)
                if ($scope.data.screenshots.length > $scope.maxScreenshots) {
                    $scope.data.screenshots.pop()
                }
                screenshot.steps--;
                $rootScope.$broadcast("add:screenshot");
            })
        })
    }

    $scope.takeScreenShotContinous = function(screenshot) {

        //清除前面未完成的pcapturepromise
        if ($scope.capturePromise) {
            return;
        }

        var step = 0,
            screenshotSteps = screenshot.steps,
            delay = screenshot.multi ? MULTI_SHOT_DELAY : SINGLE_SHOT_DELAY;

        if (screenshotSteps > 50) {
            screenshotSteps = 50;
        }

        $rootScope.$broadcast("start:screenshot");

        $scope.capturePromise = $interval(function() {
            step++;
            $scope.takeScreenShot(screenshot)
            if (step >= screenshotSteps) {
                $interval.cancel($scope.capturePromise)
                screenshot.screenshotSteps = 1
                $scope.capturePromise = null;
                $rootScope.$broadcast("end:screenshot");
            }
        }, delay)
    }

    $scope.zoom = function(param) {
        var newValue = parseInt($scope.screenShotSize, 10) + param.step
        if (param.min && newValue < param.min) {
            newValue = param.min
        } else if (param.max && newValue > param.max) {
            newValue = param.max
        }
        $scope.screenShotSize = newValue
    }

    $scope.$on('$destroy', function () {
        listenerScreenshot();
    })

    $scope.getSnapshot = function(snapshot, device) {
        // android去stf版本(image属性)和ios(href属性)返回的截图是绝对路径的,老版android截图返回的相对路径(href属性)
        return snapshot.body.image || (/^http/.test(snapshot.body.href) ? snapshot.body.href : (device.host + snapshot.body.href));
    }
}

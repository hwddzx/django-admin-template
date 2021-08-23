angular.module('stf.install')
    .controller('InstallCtrl', InstallCtrl);

function InstallCtrl(
    $scope, $timeout, InstallService, RioService, StorageService, $stateParams
) {
    $scope.accordionOpen = true
    $scope.installation = null

    $scope.clear = function() {
        $scope.installation = null
        $scope.accordionOpen = false
    }

    $scope.$on('installation', function(e, installation) {
        $scope.installation = installation.apply($scope)
        installation.on("change", function() {
            if (installation.state == "installed") {
                $timeout(function() {
                    $scope.clear();
                }, 2000);
            }
        })
    })

    $scope.installUrl = function(url) {
        return InstallService.installUrl($scope.control, url)
    }

    $scope.installFile = function($files) {
        StorageService.setDeviceHost(RioService.getCurrentRioDevice().host);
        if ($files.length) {
            return InstallService.installFile($scope.control, $files)
        }
    }

    $scope.uninstall = function(packageName) {
        // TODO: After clicking uninstall accordion opens
        return $scope.control.uninstall(packageName)
            .then(function() {
                $scope.$apply(function() {
                    $scope.clear()
                })
            })
    }
}

angular.module("quail.install", ['stf.install-service'])
    .controller("InstallCtrl", InstallController);

function InstallController($scope, $uibModalInstance, $timeout, DialogService, InstallService, control, device, release) {

    $scope.device = device;

    $scope.installtion = InstallService.installUrl(control, release);

    $scope.installtion.apply($scope);

    $scope.installtion.promise.then(function() {
        if ($scope.installtion.success) {
            $timeout(function() {
                $uibModalInstance.close();
            }, 1000)
        }
    })

    $scope.cancel = function() {
        if ($scope.installtion.error) {
            $uibModalInstance.dismiss();
            return;
        }
        DialogService.confirm("取消安装将结束任务，确定退出?").then(function() {
            $uibModalInstance.dismiss();
        })
    }

}

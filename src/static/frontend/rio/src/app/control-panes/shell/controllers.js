angular.module("stf.shell").controller('ShellCtrl', ShellCtrl);

function ShellCtrl($scope, DeviceDataService) {
    $scope.result = null

    $scope.data = DeviceDataService.getCacheData();
    $scope.command = $scope.data.command;
    $scope.result = $scope.data.result;
    
    $scope.run = function() {
        $scope.data.command = $scope.command;
        if ($scope.data.command === 'clear') {
            $scope.clear()
            return
        }

        if (!$scope.data.command.trim()) {
            return;
        }

        return $scope.control.shell($scope.data.command)
            .progressed(function(result) {
                $scope.result = result.data.join('')
                $scope.data.result = $scope.result
                $scope.$digest()
            })
            .then(function(result) {
                $scope.result = result.data.join('')
                $scope.data.result = $scope.result
                $scope.command = ""
                $scope.$digest()
            })
    }

    $scope.clear = function() {
        $scope.data.command = ''
        $scope.data.result = ''
        $scope.command = '';
        $scope.result = null
    }
}

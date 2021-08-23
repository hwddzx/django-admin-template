angular.module('finance')
    .controller('FinanceCtrl', FinanceController)
    .controller('RentRecordsCtrl', RentRecordsController);

function FinanceController($scope, config, customer) {
    $scope.config = config;
    $scope.customer = customer;
}

function RentRecordsController($scope, $state, $controller, RioService, FinanceService, RentModalService) {

    $scope.records = [];
    $scope.isDeviceLocked = RioService.isDeviceLocked;
    $scope.isDeviceOutStock = RioService.isDeviceOutStock;
    $scope.isDeviceAvailable = RioService.isDeviceAvailable;

    $scope.download = function(fileUrl) {
        window.location = fileUrl;
    }

    $scope.showRentModal = function(device) {
        RioService.showRentModal(device);
    }

    $scope.setCurrentDevice = function(device) {
        $scope.currentDevice = device;
    }

    $scope.tableCtrl = $controller("paginationTableCtrl");

    $scope.tableCtrl.setDataSource(FinanceService.getRentList);

    $scope.tableCtrl.onloaded = function(data) {
        $scope.records = $scope.records.concat(data);
        $scope.count = $scope.tableCtrl.count;

    }
}

(function(){
    angular.module("stf.rent-modal", ['ui.bootstrap'])
        .factory("RentModalService", function($uibModal) {

            return {
                open: function(device) {
                    return $uibModal.open({
                        templateUrl: 'components/common-ui/rent-modal/rent.modal.html',
                        size: 'lg',
                        resolve: {
                            customerDuration: function(RioService) {
                               return RioService.getCustomerDuration().then(function(res){
                                   return res;
                                });
                            }
                        },
                        controller: function($scope, $uibModalInstance, customerDuration) {
                            $scope.times = "60";
                            $scope.device = device;
                            $scope.customTime = false;
                            $scope.hour = 0.5;
                            $scope.customHour = 1;
                            $scope.customerDuration = customerDuration;
                            $scope.setHour = function(hour) {
                                $scope.hour = hour;
                                $scope.customMode = false;
                            }
                            $scope.setCustomMode = function() {
                                $scope.customMode = true;
                            }
                            $scope.isTimesValid = function() {
                                return $scope.customMode ? ((getTimes() > 0) && (getTimes() % 30 == 0)) : true;
                            }
                            $scope.cancel = function() {
                                $uibModalInstance.dismiss();
                            }
                            $scope.close = function() {
                                $scope.times = getTimes();
                                if (!$scope.isTimesValid()) {
                                    return;
                                }

                                $uibModalInstance.close({
                                    device: $scope.device,
                                    minutes: $scope.times
                                });
                            }

                            function getTimes() {
                                return Math.ceil(($scope.customMode ? $scope.customHour : $scope.hour) * 60);
                            }

                            //一分钟后默认取消
                            setTimeout(function () {
                                $scope.cancel();
                            }, 60000)
                        }
                    })

                }
            };
        });
})();

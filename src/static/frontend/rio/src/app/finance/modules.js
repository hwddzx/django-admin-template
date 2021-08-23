angular.module('finance', ['stf.page-visibility', 'stf.table'])
    .config(['$stateProvider', function($stateProvider) {
        $stateProvider.state("finance", {
                url: "/finance",
                templateUrl: 'app/finance/templates/finance.html',
                controller: 'FinanceCtrl',
                resolve: {
                    customer: function(RioService) {
                        return RioService.getCustomerInfo();
                    }
                }
            })
            .state("finance.rentrecords", {
                url: "/rentrecords",
                templateUrl: 'app/finance/templates/rent.records.html',
                controller: 'RentRecordsCtrl',
                resolve: {}
            });

    }]);

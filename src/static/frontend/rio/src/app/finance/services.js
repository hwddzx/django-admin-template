(function() {

    angular.module('finance')
        .factory("FinanceService", FinanceService);

    function FinanceService($rootScope, $q, $http, $uibModal, $state, config) {

        return {
            getRentList: function() {
                return $http.get("/api/rio/rent/list/");
            }
        }

    }
}());

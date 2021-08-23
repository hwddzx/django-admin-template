(function() {
    angular.module('quail.report')
        .controller('ReportsCtrl', ReportsController);

    function ReportsController($rootScope, $scope, $filter, $stateParams, ModalService, ReportService, Pagination) {
        $scope.pagination = new Pagination(function(pageNum) {
            return ReportService.getReports($stateParams.key, pageNum);
        });
    }

})();

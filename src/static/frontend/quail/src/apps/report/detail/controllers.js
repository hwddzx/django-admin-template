(function() {
    angular.module('quail.report').controller("ReportDetailCtrl", ReportDetailController);

    function ReportDetailController($scope, $location, $state, $stateParams, config, reportDetail, ReportDetailService, ReportDetailFilter, executions, TASK_ENUM) {

        $scope.hashkey = $stateParams.hashkey;
        $scope.reportDetail = reportDetail;
        $scope.executions = executions;
        $scope.filters = ReportDetailService.filters;
        $scope.keyword = "";

        $scope.openExecutionDetail = openExecutionDetail;
        $scope.exportExcel =  exportExcel;
        $scope.chooseFilter = chooseFilter;

        _activate();
        function _activate() {
            $scope.filteredExecutions = ReportDetailService.getFilterExecution($scope.executions);
        }
        $scope.longestScenario = _.max($scope.reportDetail.metrics.scenarios, function(scenario) {
            return _getTotalExecutionCount(scenario);
        }) || {};

        $scope.longestScenario.total = _getTotalExecutionCount($scope.longestScenario);

        if (reportDetail.metrics.severity_critical_count +
            reportDetail.metrics.severity_fatal_count +
            reportDetail.metrics.severity_minor_count +
            reportDetail.metrics.severity_normal_count == 0 ) {
            reportDetail.metrics.showSeverityChart = false;
        } else {
            reportDetail.metrics.showSeverityChart = true;
        }

        //排序使用负号会和angular中倒叙混淆
        _.each($scope.reportDetail.metrics.scenarios, function(scenario) {
            scenario.failed = scenario[TASK_ENUM.executionResult.failed];
        })

        $scope.shareLink = window.location.protocol + "//" + window.location.host + "/report/" + reportDetail.hashkey + "/";

        function _getTotalExecutionCount(scenario){
            if (!scenario) return;
            return scenario[TASK_ENUM.executionResult.blocked] +
                scenario[TASK_ENUM.executionResult.passed] +
                scenario[TASK_ENUM.executionResult.failed];
        }

        function openExecutionDetail(execution){
            // "/false" --> canChangeCompare:false
            var url = $state.href("executionDetail", {hashkey: execution.hashkey, canChangeCompare: false}, {lossy: false, absolute: true});
            if (config.html5Mode) {
                // html5把search放url后面
                url = url + decodeURIComponent(location.search);
            } else {
                //$state.href返回以"/"结束,location.pathname以"/"开始,所以location.pathname.substring(1),去掉一个"/"
                url = url.replace("#", location.pathname.substring(1) + location.search + "#");
            }
            window.open(url);
        }

        function exportExcel() {
            window.open("/api/task/report/" + $scope.hashkey + "/export/");
        }

        function chooseFilter(choose, filterName) {
            $scope.filters[filterName].selected = choose;
            $scope.filteredExecutions = ReportDetailService.getFilterExecution($scope.executions);
        }
    }
})();
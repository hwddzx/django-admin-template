(function() {
    angular.module("charts")
        .controller("ChartsController", ChartsController);

    function ChartsController($scope, $filter, config, $stateParams, ChartsService, versions, scenarios, overview, chartDetail) {
        var vm = this,
            appKey = $scope.app.key;

        vm.versions = versions;
        vm.scenarios = scenarios;
        vm.tableData = overview.overview_data;
        vm.chartDetail = chartDetail;
        vm.severities = ChartsService.severities;
        vm.start_version = vm.versions[vm.versions.length - 1].id.toString();
        vm.end_version = vm.versions[0].id.toString();
        vm.format = "yyyy-MM-dd";
        var date = new Date();
        vm.startPopup = {
            opened: false,
            date: new Date().setTime(date.getTime() - 6 * 24 * 60 * 60 * 1000)  //开始时间在7天前
        };
        vm.endPopup = {
            opened: false,
            date: new Date().setTime(date.getTime() + 1 * 24 * 60 * 60 * 1000)  //从0点开始算，因此加上1天的毫秒数
        };
        vm.scriptChartSeries = [];
        vm.passChartSeries = [];
        vm.exceptionsChartSeries = [];
        vm.fileSizeChartSeries = [];
        vm.installDelayChartSeries = [];
        vm.startDelayChartSeries = [];
        vm.dataTrafficChartSeries = [];
        vm.cpuChartSeries = [];
        vm.memoryChartSeries = [];

        vm.openDatePicker = openDatePicker;
        vm.getData = getData;
        vm.getChartOverview = getChartOverview;
        vm.getChartDetail = getChartDetail;

        _activate();
        function _activate() {
            vm.scriptChartSeries = _initChartSeries(vm.chartDetail.script_build_data, 'script_count');
            vm.passChartSeries = _initChartSeries(vm.chartDetail.testcase_passing_rate_data, 'testcase_passing_rate');
            vm.exceptionsChartSeries = _initChartSeries(vm.chartDetail.exception_data, 'exception_count');
        }

        function _initChartSeries(res, key) {
            var series = [];
            _.forEach(res, function (data) {
                series.push({
                    name: data.version,
                    y: key == 'testcase_passing_rate' ? parseFloat((data[key] * 100).toFixed(2)) : data[key]
                });
            });
            return series;
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }

        function getData() {
            vm.getChartOverview();
            vm.getChartDetail('all');
        }

        function getChartOverview() {
            var params = {
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd'),
                end_date: $filter('date')(vm.endPopup.date, 'yyyy-MM-dd'),
                start_version: vm.start_version ? Number(vm.start_version) : null,
                end_version: vm.end_version ? Number(vm.end_version) : null
            }
            ChartsService.getChartOverview(appKey, params).then(function(res) {
                vm.tableData = res.overview_data;
            });
        }

        function getChartDetail(type) {
            var params ={
                script_build_scenario: vm.script_build_scenario,
                testcase_passing_rate_scenario: vm.testcase_passing_rate_scenario,
                exception_scenario: vm.exception_scenario,
                exception_severity: vm.exception_severity,
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd'),
                end_date: $filter('date')(vm.endPopup.date, 'yyyy-MM-dd'),
                start_version: vm.start_version ? Number(vm.start_version) : null,
                end_version: vm.end_version ? Number(vm.end_version) : null
            }
            ChartsService.getChartDetail(appKey,params).then(function(res) {
                switch (type) {
                    case 'script':
                        vm.scriptChartSeries = _initChartSeries(res.script_build_data, 'script_count');
                        vm.drawScriptChart();
                        break;
                    case 'pass':
                        vm.passChartSeries = _initChartSeries(res.testcase_passing_rate_data, 'testcase_passing_rate');
                        vm.drawPassChart();
                        break;
                    case 'exceptions':
                        vm.exceptionsChartSeries = _initChartSeries(res.exception_data, 'exception_count');
                        vm.drawExceptionsChart();
                        break;
                    case 'all':
                        vm.scriptChartSeries = _initChartSeries(res.script_build_data, 'script_count');
                        vm.drawScriptChart();
                        vm.passChartSeries = _initChartSeries(res.testcase_passing_rate_data, 'testcase_passing_rate');
                        vm.drawPassChart();
                        vm.exceptionsChartSeries = _initChartSeries(res.exception_data, 'exception_count');
                        vm.drawExceptionsChart();
                        break;
                }
            });
        }
    }
})();
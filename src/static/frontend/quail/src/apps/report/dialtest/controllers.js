(function() {
    angular.module("quail.report")
        .controller("DialtestOverviewCtrl", DialtestOverviewCtrl)
        .controller("DialtestDatacheckCtrl", DialtestDatacheckCtrl)
        .controller("DialtestFunctestCtrl", DialtestFunctestCtrl)
        .controller("DialtestTablesCtrl", DialtestTablesCtrl)
        .controller("DialtestEmailModalCtrl", DialtestEmailModalCtrl);

    function DialtestOverviewCtrl($filter, $state, $q, DialogService, ModalService, TaskService, DialtestService, overview) {
        var vm = this;

        vm.format = "yyyy-MM-dd";
        vm.overview = overview;
        vm.startPopup = {
            opened: false,
            date: null
        };
        vm.endPopup = {
            opened: false,
            date: null
        };

        vm.overview = overview;
        vm.scenarios = overview.scenarios
        vm.functestPassSeries = [];
        vm.functestRunSeries = [];
        vm.functestTimeSeries = [];
        vm.datacheckPassSeries = [];
        vm.datacheckRunSeries = [];
        vm.datacheckTimeSeries = [];
        vm.functestScenarioSeries = [];
        vm.datacheckScenarioSeries = [];
        vm.scenarioCategories = [];

        vm.openDatePicker = openDatePicker;
        vm.getData = getData;
        vm.getOverview = getOverview;
        vm.sentEmail = sentEmail;
        vm.goFunctest = goFunctest;
        vm.goDatacheck = goDatacheck;

        _activate();
        function _activate() {
            vm.app = overview.app_info;
            vm.app.icon_url = vm.app.icon_url.replace('http://file.lab.tb/upload/', vm.app.url_prefix.image_host);

            //功能测试用例通过率饼图
            vm.testcaseAll = vm.overview.testcase_result.success + vm.overview.testcase_result.failed + vm.overview.testcase_result.blocked;
            var functestPassRate = vm.testcaseAll ? vm.overview.testcase_result.success / vm.testcaseAll : 0
            vm.functestPassTitle = "通过率<br>" + (functestPassRate * 100).toFixed(2) + "%";
            vm.functestPassSeries = [
                {name: "用例通过数：" + vm.overview.testcase_result.success, y: vm.overview.testcase_result.success},
                {name: "用例失败数：" + vm.overview.testcase_result.failed, y: vm.overview.testcase_result.failed},
                {name: "用例阻塞数：" + vm.overview.testcase_result.blocked, y: vm.overview.testcase_result.blocked}
            ];

            //功能测试用例运行柱状图
            vm.testcaseRunAll = 0;
            vm.testcaseRunSuccess = 0;
            vm.testcaseRunBlocked = 0;
            vm.testcaseRunFailed = 0;
            //功能测试时间线
            var testcaseTimeSuccessList = [];
            var testcaseTimeBlockedList = [];
            var testcaseTimeFailedList = [];
            _.forEach(vm.overview.execution_result, function(value) {
                vm.testcaseRunSuccess += value.success;
                vm.testcaseRunBlocked += value.blocked;
                vm.testcaseRunFailed += value.failed;
                //功能测试时间线
                testcaseTimeSuccessList.push(value.success);
                testcaseTimeBlockedList.push(value.blocked);
                testcaseTimeFailedList.push(value.failed);
            });
            vm.functestTimeSeries = [
                {name: "成功", data: testcaseTimeSuccessList},
                {name: "失败", data: testcaseTimeFailedList},
                {name: "阻塞", data: testcaseTimeBlockedList}
            ]
            vm.testcaseRunAll = vm.testcaseRunSuccess + vm.testcaseRunBlocked + vm.testcaseRunFailed;
            vm.functestRunSeries = [vm.testcaseRunSuccess, vm.testcaseRunFailed, vm.testcaseRunBlocked];

            //数据检查运行柱状图
            vm.datacheckRunAll = 0;
            vm.datacheckRunSuccess = 0;
            vm.datacheckRunFailed = 0;
            //数据检查时间线
            var datacheckTimeSuccessList = [];
            var datacheckTimeFailedList = [];
            _.forEach(vm.overview.output_result, function(value) {
                vm.datacheckRunSuccess += value.success;
                vm.datacheckRunFailed += value.failed;
                //数据检查时间线
                datacheckTimeSuccessList.push(value.success);
                datacheckTimeFailedList.push(value.failed);
            });
            vm.datacheckTimeSeries = [
                {name: "通过", data: datacheckTimeSuccessList},
                {name: "失败", data: datacheckTimeFailedList}
            ]
            vm.datacheckRunAll = vm.datacheckRunSuccess + vm.datacheckRunFailed;
            vm.datacheckRunSeries = [vm.datacheckRunSuccess, vm.datacheckRunFailed];

            //功能测试场景概况 //数据检查场景概况
            vm.functestScenarioSeries = [
                {name: "通过", data: []},
                {name: "失败", data: []},
                {name: "阻塞", data: []}
            ];
            vm.datacheckScenarioSeries = [
                {name: "通过", data: []},
                {name: "失败", data: []}
            ];
            //数据检查通过率饼图
            vm.datacheckPassAll = 0;
            vm.datacheckFailAll = 0;
            _.forEach(vm.overview.scenario_result, function(value, key) {
                vm.scenarioCategories.push(key);
                vm.functestScenarioSeries[0].data.push(value.success); //功能测试通过
                vm.functestScenarioSeries[1].data.push(value.failed); //功能测试失败
                vm.functestScenarioSeries[2].data.push(value.blocked); //功能测试阻塞
                vm.datacheckScenarioSeries[0].data.push(value.output_success); //数据检查通过
                vm.datacheckScenarioSeries[1].data.push(value.output_failed); //数据检查失败
                //数据检查总数-饼图
                vm.datacheckPassAll += value.output_success;
                vm.datacheckFailAll += value.output_failed;
            });
            vm.datacheckAll = vm.datacheckPassAll + vm.datacheckFailAll;
            var datacheckPassRate = vm.datacheckAll ? vm.datacheckPassAll / vm.datacheckAll : 0;
            vm.datacheckPassTitle = "通过率<br>" + (datacheckPassRate * 100).toFixed(2) + "%";
            vm.datacheckPassSeries = [
                {name: "通过数：" + vm.datacheckPassAll, y: vm.datacheckPassAll},
                {name: "失败数：" + vm.datacheckFailAll, y: vm.datacheckFailAll}
            ];
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }

        function getData() {
            vm.getOverview();
        }

        function getOverview() {
            var params = {
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd')
            }
            DialtestService.getDialtestOverview(vm.app.key, params).then(function(res) {
                vm.overview = res;
                vm.app = res.app_info;
                _activate();
                vm.drawDialtestFunctestPass();
                vm.drawDialtestFunctestRun();
                vm.drawDialtestFunctestTime();
                vm.drawDialtestDatacheckPass();
                vm.drawDialtestDatacheckRun();
                vm.drawDialtestDatacheckTime();
                vm.drawDialtestFunctestScenario();
                vm.drawDialtestDatacheckScenario();
            });
        }
        
        function sentEmail() {
            ModalService.show({
                templateUrl: 'apps/report/dialtest/templates/dialtest.email.modal.html',
                controller: 'DialtestEmailModalCtrl',
                controllerAs: 'vm',
                windowClass: 'window-rent-modal',
                size: 'large',
                resolve: {
                    mails: function () {
                        return TaskService.getMails();
                    },
                    model: function () {
                        return {
                            testcaseAll: vm.testcaseAll,
                            testcaseSuccess: vm.overview.testcase_result.success,
                            testcaseFailed: vm.overview.testcase_result.failed,
                            testcaseBlocked: vm.overview.testcase_result.blocked,
                            testcaseRunAll: vm.testcaseRunAll,
                            testcaseRunSuccess: vm.testcaseRunSuccess,
                            testcaseRunFailed: vm.testcaseRunFailed,
                            testcaseRunBlocked: vm.testcaseRunBlocked,
                            datacheckAll: vm.datacheckAll,
                            datacheckPassAll: vm.datacheckPassAll,
                            datacheckFailAll: vm.datacheckFailAll,
                            datacheckRunAll: vm.datacheckRunAll,
                            datacheckRunSuccess: vm.datacheckRunSuccess,
                            datacheckRunFailed: vm.datacheckRunFailed,
                            start_time: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd')
                        };
                    }
                }
            }).then(function(model) {
                var params = {
                    mail_group: model.mail_group,
                    app_releases: vm.overview.releases.join(','),
                    start_time: model.start_time,
                    testcase_detail: model.testcase_detail,
                    output_detail: model.output_detail,
                    desc: model.desc
                }
               DialtestService.sentEmail(params).then(function() {
                   DialogService.alert("邮件发送成功！");
               });
            });
        }

        function goFunctest() {
            window.open($state.href("dialtestFunctest", {
                appKey: vm.app.key,
                startDate: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd')
            }), '_blank');
        }

        function goDatacheck() {
            window.open($state.href("dialtestDatacheck", {
                appKey: vm.app.key,
                startDate: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd')
            }), '_blank');
        }
    }

    function DialtestDatacheckCtrl($stateParams, $state, $filter, DialtestService, spinner, $timeout, overview, datacheckSummary) {
        var vm = this;

        vm.overview = overview;
        vm.app = overview.app_info;
        vm.app.icon_url = vm.app.icon_url.replace('http://file.lab.tb/upload/', vm.app.url_prefix.image_host);
        vm.summary = datacheckSummary;
        vm.scenarios = datacheckSummary.scenarios;
        vm.scenario = vm.scenarios[0][0].toString();
        vm.datacheckReportSeries = [];
        vm.datacheckTimeSeries = [];
        vm.scenarioCategories = [];

        vm.getDatacheckReport = getDatacheckReport;
        vm.filterTableByKeyword = filterTableByKeyword;
        vm.openDetail = openDetail;
        vm.chooseFilter = chooseFilter;

        _activate();
        function _activate() {
            //上方表格
            vm.datacheckRunAll = 0;
            vm.datacheckRunSuccess = 0;
            vm.datacheckRunFailed = 0;
            _.forEach(vm.overview.output_result, function(value) {
                vm.datacheckRunSuccess += value.success;
                vm.datacheckRunFailed += value.failed;
            });
            vm.datacheckRunAll = vm.datacheckRunSuccess + vm.datacheckRunFailed;
            vm.datacheckPassAll = 0;
            vm.datacheckFailAll = 0;
            _.forEach(vm.overview.scenario_result, function(value) {
                vm.datacheckPassAll += value.output_success;
                vm.datacheckFailAll += value.output_failed;
            });
            vm.datacheckAll = vm.datacheckPassAll + vm.datacheckFailAll;
            //下方图表
            vm.getDatacheckReport();
        }

        function getDatacheckReport() {
            spinner.show();
            vm.filters = {
                scenario: 'all',
                deviceName: 'all',
                deviceOs: 'all',
                result: 'all'
            };
            vm.datacheckReportSeries = [
                {name: "成功", data: []},
                {name: "失败", data: []},
            ];
            var datacheckTimeSuccessList = [];
            var datacheckTimeFailedList = [];
            vm.scenarioCategories = [];
            DialtestService.getDatacheckScenarioReport(vm.scenario, {start_date: $stateParams.startDate}).then(function(res) {
                spinner.hide();
                //时间线
                _.forEach(res.output_result, function(value) {
                    vm.datacheckRunSuccess += value.success;
                    vm.datacheckRunFailed += value.failed;
                    //数据检查时间线
                    datacheckTimeSuccessList.push(value.success);
                    datacheckTimeFailedList.push(value.failed);
                });
                vm.datacheckTimeSeries = [
                    {name: "通过", data: datacheckTimeSuccessList},
                    {name: "失败", data: datacheckTimeFailedList}
                ];
                vm.drawDialtestDatacheckTime();
                //场景通过概况
                _.forEach(res.scenario_result, function(value, key) {
                    vm.datacheckReportSeries[0].data.push(value.success);
                    vm.datacheckReportSeries[1].data.push(value.failed);
                    vm.scenarioCategories.push(key);
                });
                vm.drawDialtestDatacheckReport();
                //表格
                vm.tableData = [];
                _.forEach(res.output_details, function(value) {
                    vm.tableData = vm.tableData.concat(value);
                });
                vm.tableData = _.filter(vm.tableData, function(data) {
                    return data.result;
                });
                //计算用例的运行次数和通过率，找出列表中相同用例id的项加起来计算
                // var testcases = _.chain(vm.tableData).map('execution_id').uniq().value(); //找出列表中不同的用例id，去重
                // vm.testcase_running_obj = {};
                // _.forEach(testcases, function(testcase) {
                //     var filteredTestcaseTableData = _.filter(vm.tableData, function(data) {  //每一个用例id在总列表中对应的项，组成一个list
                //         return data.execution_id == testcase;
                //     });
                //     vm.testcase_running_obj[testcase] = {};
                //     vm.testcase_running_obj[testcase].total = filteredTestcaseTableData.length;
                //     vm.testcase_running_obj[testcase].success = _getTestcaseSuccessCount(filteredTestcaseTableData);
                //     vm.testcase_running_obj[testcase].rate = vm.testcase_running_obj[testcase].total ? ((vm.testcase_running_obj[testcase].success / vm.testcase_running_obj[testcase].total) * 100).toFixed(2) + '%' : '0%';
                // });
                //过滤用的devices
                vm.deviceNames = DialtestService.getFilterDevices(vm.tableData, 'name');
                vm.deviceOses = DialtestService.getFilterDevices(vm.tableData, 'os');
                vm.results = DialtestService.getFilterResults(vm.tableData, 'result');
                vm.filterTableData = DialtestService.filterTables(vm.tableData, vm.filters);
                $timeout(function() {
                    $(window).scrollTop(0); //滚动到顶部
                }, 200);
            });

            // function _getTestcaseSuccessCount(list) {
            //     var success = 0;
            //     _.forEach(list, function(item) {
            //         if (item.variable_check_result) {
            //             success += 1;
            //         }
            //     });
            //     return success;
            // }
        }

        function filterTableByKeyword() {
            _filterTable();
        }

        function openDetail(url) {
            window.open(url);
        }

        function chooseFilter(value, key) {
            vm.filters[key] = value;
            _filterTable();
        }

        function _filterTable() {
            vm.filterTableData = DialtestService.filterTableByKeyword(vm.keyword, vm.tableData);
            vm.filterTableData = DialtestService.filterTables(vm.filterTableData, vm.filters);
        }
    }

    function DialtestFunctestCtrl($stateParams, $state, $filter, DialtestService, spinner, $timeout, overview, functestSummary) {
        var vm = this;

        vm.overview = overview;
        vm.app = overview.app_info;
        vm.app.icon_url = vm.app.icon_url.replace('http://file.lab.tb/upload/', vm.app.url_prefix.image_host);
        vm.summary = functestSummary;
        vm.scenarios = functestSummary.scenarios;
        vm.scenario = vm.scenarios[0][0].toString();
        vm.functestReportSeries = [];
        vm.functestTimeSeries = [];
        vm.scenarioCategories = [];

        vm.getFunctestReport = getFunctestReport;
        vm.filterTableByKeyword = filterTableByKeyword;
        vm.openDetail = openDetail;
        vm.chooseFilter = chooseFilter;

        _activate();
        function _activate() {
            //头部的表格
            vm.testcaseAll = vm.overview.testcase_result.success + vm.overview.testcase_result.failed + vm.overview.testcase_result.blocked;
            vm.functestPassRate = ((vm.testcaseAll ? vm.overview.testcase_result.success / vm.testcaseAll : 0) * 100).toFixed(2) + '%';
            vm.testcaseRunAll = 0;
            vm.testcaseRunSuccess = 0;
            vm.testcaseRunBlocked = 0;
            vm.testcaseRunFailed = 0;
            _.forEach(vm.overview.execution_result, function(value) {
                vm.testcaseRunSuccess += value.success;
                vm.testcaseRunBlocked += value.blocked;
                vm.testcaseRunFailed += value.failed;
            });
            vm.testcaseRunAll = vm.testcaseRunSuccess + vm.testcaseRunBlocked + vm.testcaseRunFailed;
            //下方图表
            vm.getFunctestReport();
        }

        function getFunctestReport() {
            spinner.show();
            vm.filters = {
                scenario: 'all',
                deviceName: 'all',
                deviceOs: 'all',
                result: 'all'
            };
            vm.functestReportSeries = [
                {name: "成功", data: []},
                {name: "失败", data: []},
                {name: "阻塞", data: []},
            ];
            //功能测试时间线
            var testcaseTimeSuccessList = [];
            var testcaseTimeBlockedList = [];
            var testcaseTimeFailedList = [];
            vm.scenarioCategories = [];
            DialtestService.getFunctestScenarioReport(vm.scenario, {start_date: $stateParams.startDate}).then(function(res) {
               spinner.hide();
                _.forEach(res.execution_result, function (value) {
                //功能测试时间线
                    testcaseTimeSuccessList.push(value.success);
                    testcaseTimeBlockedList.push(value.block);
                    testcaseTimeFailedList.push(value.failed);
                });
                vm.functestTimeSeries = [
                    {name: "成功", data: testcaseTimeSuccessList},
                    {name: "失败", data: testcaseTimeFailedList},
                    {name: "阻塞", data: testcaseTimeBlockedList}
                ];
                vm.drawDialtestFunctestTime();
                //场景通过概况
                _.forEach(res.scenario_result, function(value, key) {
                    vm.functestReportSeries[0].data.push(value.success);
                    vm.functestReportSeries[1].data.push(value.failed);
                    vm.functestReportSeries[2].data.push(value.blocked);
                    vm.scenarioCategories.push(key);
                });
                vm.drawDialtestFunctestReport();
                //表格
                vm.tableData = [];
                _.forEach(res.execution_details, function(value) {
                    vm.tableData = vm.tableData.concat(value);
                });
                vm.tableData = _.filter(vm.tableData, function(data) {
                    return data.result;
                });
                //计算用例的运行次数和通过率，找出列表中相同用例id的项加起来计算
                // var testcases = _.chain(vm.tableData).map('testcase_id').uniq().value(); //找出列表中不同的用例id，去重
                // vm.testcase_running_obj = {};
                // _.forEach(testcases, function(testcase) {
                //     var filteredTestcaseTableData = _.filter(vm.tableData, function(data) {  //每一个用例id在总列表中对应的项，组成一个list
                //         return data.testcase_id == testcase;
                //     });
                //     vm.testcase_running_obj[testcase] = {};
                //     vm.testcase_running_obj[testcase].total = filteredTestcaseTableData.length;
                //     vm.testcase_running_obj[testcase].success = _getTestcaseSuccessCount(filteredTestcaseTableData);
                //     vm.testcase_running_obj[testcase].rate = vm.testcase_running_obj[testcase].total ? ((vm.testcase_running_obj[testcase].success / vm.testcase_running_obj[testcase].total) * 100).toFixed(2) + '%' : '0%';
                // });
                //过滤用的devices
                vm.deviceNames = DialtestService.getFilterDevices(vm.tableData, 'name');
                vm.deviceOses = DialtestService.getFilterDevices(vm.tableData, 'os');
                vm.results = DialtestService.getFilterResults(vm.tableData, 'result');
                vm.filterTableData = DialtestService.filterTables(vm.tableData, vm.filters);
                $timeout(function() {
                    $(window).scrollTop(0); //滚动到顶部
                }, 200);
            });

            // function _getTestcaseSuccessCount(list) {
            //     var success = 0;
            //     _.forEach(list, function(item) {
            //         if (item.result_code == 1) {
            //             success += 1;
            //         }
            //     });
            //     return success;
            // }
        }

        function filterTableByKeyword() {
            _filterTable();
        }

        function openDetail(url) {
            window.open(url);
        }

        function chooseFilter(value, key) {
            vm.filters[key] = value;
            _filterTable();
        }

        function _filterTable() {
            vm.filterTableData = DialtestService.filterTableByKeyword(vm.keyword, vm.tableData);
            vm.filterTableData = DialtestService.filterTables(vm.filterTableData, vm.filters);
        }
    }

    function DialtestTablesCtrl($filter, $state, $q, DialogService, DialtestService, overview, tableOverview) {
        var vm = this;

        vm.format = "yyyy-MM-dd";
        vm.startPopup = {
            opened: false,
            date: null
        };
        vm.endPopup = {
            opened: false,
            date: null
        };
        vm.app = overview.app_info;
        vm.app.icon_url = vm.app.icon_url.replace('http://file.lab.tb/upload/', vm.app.url_prefix.image_host);
        vm.tableData = tableOverview;
        vm.scenarios = tableOverview[0].scenarios;
        vm.releaseCategories = overview.releases;
        vm.functest_pass_scenario = vm.scenarios[0][0].toString();
        vm.functest_exception_scenario = vm.scenarios[0][0].toString();
        vm.datacheck_exception_scenario = vm.scenarios[0][0].toString();

        vm.openDatePicker = openDatePicker;
        vm.getData = getData;
        vm.getTableOverview = getTableOverview;
        vm.getFunctestPassLine = getFunctestPassLine; //获取功能测试通过率走势图
        vm.getFunctestExceptionLine = getFunctestExceptionLine; //获取功能测试问题数走势图
        vm.getDatacheckExceptionLine = getDatacheckExceptionLine; //获取数据检查问题数走势图

        _activate();
        function _activate() {
            vm.getFunctestPassLine();
            vm.getFunctestExceptionLine();
            vm.getDatacheckExceptionLine();
        }

        function openDatePicker(popup) {
            vm[popup].opened = true;
        }

        function getData() {
            vm.getTableOverview();
            _activate();
        }

        function getTableOverview() {
            var params = {
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd'),
                end_date: $filter('date')(vm.endPopup.date, 'yyyy-MM-dd')
            }
            DialtestService.getTableOverview(vm.app.key, params).then(function(res) {
                vm.tableData = res;
            });
        }

        function getFunctestPassLine() {
            vm.functestPassLineSeries = [];
            vm.functestPassLineCategories = [];
            var params = {
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd'),
                end_date: $filter('date')(vm.endPopup.date, 'yyyy-MM-dd')
            }
            DialtestService.getFunctestPassLine(vm.functest_pass_scenario, params).then(function(res){
                //功能测试通过率走势图
                _.forEach(res.scenario_rate, function(value, key) {
                    vm.functestPassLineCategories.push(key);
                    vm.functestPassLineSeries.push(Number(value));
                });
                vm.drawFunctestPassLine();
            });
        }

        function getFunctestExceptionLine() {
            vm.functestExceptionLineSeries = [];
            vm.functestExceptionLineCategories = [];
            var params = {
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd'),
                end_date: $filter('date')(vm.endPopup.date, 'yyyy-MM-dd')
            }
            DialtestService.getFunctestExceptionLine(vm.functest_exception_scenario, params).then(function(res){
                //功能测试问题数走势图
                _.forEach(res.scenario_severity, function(value, key) {
                    vm.functestExceptionLineCategories.push(key);
                    vm.functestExceptionLineSeries.push(value.fatal + value.critical + value.normal + value.minor);
                });
                vm.drawFunctestExceptionLine();
            });
        }

        function getDatacheckExceptionLine() {
            vm.datacheckExceptionLineSeries = [];
            vm.datacheckExceptionLineCategories = [];
            var params = {
                start_date: $filter('date')(vm.startPopup.date, 'yyyy-MM-dd'),
                end_date: $filter('date')(vm.endPopup.date, 'yyyy-MM-dd')
            }
            DialtestService.getDatacheckExceptionLine(vm.datacheck_exception_scenario, params).then(function(res){
                //数据检查问题数走势图
                _.forEach(res.scenario_output, function(value, key) {
                    vm.datacheckExceptionLineCategories.push(key);
                    vm.datacheckExceptionLineSeries.push(value);
                });
                vm.drawDatacheckExceptionLine();
            });
        }
    }

    function DialtestEmailModalCtrl($filter, $uibModalInstance, DialtestService, mails, model) {
        var vm = this;

        vm.model = {
            mails: null,
            mail_group: null,
            desc: null,
            testcase_detail: "用例总数" + model.testcaseAll + "条，" + "成功" + model.testcaseSuccess + "条，" + "阻塞" + model.testcaseBlocked + "条，" + "失败" + model.testcaseFailed + "条；" + "共运行" + model.testcaseRunAll + "条，" + "成功" + model.testcaseRunSuccess + "条，" + "阻塞" + model.testcaseRunBlocked + "条，" + "失败" + model.testcaseRunFailed + "条",
            output_detail: "检查点总数" + model.datacheckAll + "条，" + "成功" + model.datacheckPassAll + "条，" + "失败" + model.datacheckFailAll + "条；" + "共运行" + model.datacheckRunAll + "条，" + "成功" + model.datacheckRunSuccess + "条，" + "失败" + model.datacheckRunFailed + "条",
            start_time: model.start_time
        };
        vm.model.mails = mails;

        vm.close = close;
        vm.cancel = cancel;

        function close() {
            $uibModalInstance.close(vm.model);
        }

        function cancel() {
            $uibModalInstance.dismiss();
        }
    }

})();
(function () {
    angular.module("quail.report")
        .factory("DialtestService", DialtestService);

    function DialtestService($q, $http, DIALTEST_ENUM) {

        var service = {
            getDialtestOverview: getDialtestOverview,
            getFunctestSummary: getFunctestSummary, //获取功能测试概况，包含列表中用来筛选的场景
            getFunctestScenarioReport: getFunctestScenarioReport,  //获取功能测试场景概况和用例详情
            getDatacheckSummary: getDatacheckSummary, //获取数据检查概况
            getDatacheckScenarioReport: getDatacheckScenarioReport, //获取数据检查场景概况和用例详情
            getTableOverview: getTableOverview,  //获取报表概况
            getFunctestPassLine: getFunctestPassLine,  //获取功能测试通过率走势图
            getFunctestExceptionLine: getFunctestExceptionLine,  //获取功能测试问题数走势图
            getDatacheckExceptionLine: getDatacheckExceptionLine,  //获取功能测试通过率走势图
            sentEmail: sentEmail,
            getFilterDevices: getFilterDevices,
            getFilterResults: getFilterResults,
            filterTables: filterTables,
            filterTableByKeyword: filterTableByKeyword,
            collapseTableByTestcase: collapseTableByTestcase
        }

        return service;

        function getDialtestOverview(appKey, params) {
            return $http.get("/api/task/app/" + appKey + "/overview/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/dialtest.overview.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getFunctestSummary(appKey, params) {
            return $http.get("/api/task/app/" + appKey + "/scenario/summary/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/functest.summary.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getFunctestScenarioReport(key, params) {
            return $http.get("/api/task/scenario/" + key + "/report/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/functest.report.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getDatacheckSummary(key, params) {
            return $http.get("/api/task/app/" + key + "/output/summary/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/datacheck.summary.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getDatacheckScenarioReport(key, params) {
            return $http.get("/api/task/scenario/" + key + "/output/report/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/datacheck.report.json").then(function(res) {
            //     return res.data;
            // });
        }
        
        function getTableOverview(appKey, params) {
            return $http.get("/api/task/app/" + appKey + "/distributed/overview/", {params: params}).then(function (res) {
                return res.data;
            });
            // console.log(params);
            // return $http.get("assets/testjson/table.overview.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getFunctestPassLine(key, params) {
            return $http.get("/api/task/scenario/" + key + "/release/rate/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/functest.passline.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getFunctestExceptionLine(key, params) {
            return $http.get("/api/task/scenario/" + key + "/release/severity/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/functest.exceptionline.json").then(function(res) {
            //     return res.data;
            // });
        }

        function getDatacheckExceptionLine(key, params) {
            return $http.get("/api/task/scenario/" + key + "/release/output/", {params: params}).then(function (res) {
                return res.data;
            });
            // return $http.get("assets/testjson/datacheck.exceptionline.json").then(function(res) {
            //     return res.data;
            // });
        }
        
        function sentEmail(params) {
            return $http.post("/api/task/distributed/report/email/", params);
        }

        function getFilterDevices(details, key) {
            var result = [];
            _.forEach(details, function(value) {
                if (value.device.name) result.push(value.device[key]);
            });
            return _.uniq(result);
        }

        function getFilterResults(details, resultKey) {
            var result = [];
            _.forEach(details, function(value) {
                if (value[resultKey]) result.push(value[resultKey]);
            });
            return _.uniq(result);
        }

        function filterTables(tableData, filters) {
            return _.filter(tableData, function(data) {
                var valid = true;
                _.forEach(filters, function(value, key) {
                    if (key == "deviceName") {
                        if (value != 'all' && value != data.device.name) {
                            valid = false;
                            return false;
                        }
                    }
                    if (key == "deviceOs") {
                        if (value != 'all' && value != data.device.os) {
                            valid = false;
                            return false;
                        }
                    }
                    if (key == "scenario") {
                        if (value != 'all' && data.scenario.indexOf(value) == -1) {
                            valid = false;
                            return false;
                        }
                    }
                    if (key == "result") {
                        if (value != 'all' && value != data.result) {
                            valid = false;
                            return false;
                        }
                    }
                    if (key == "variable_check_result") {
                        if (value != 'all' && value != data.variable_check_result) {
                            valid = false;
                            return false;
                        }
                    }
                });
                return valid;
            });
        }

        function filterTableByKeyword(keyword, tableData) {
            var result = [];
            if (!keyword) {
                result = _.cloneDeep(tableData);
            } else {
                _.forEach(tableData, function(item) {
                    var confirm = false
                    _.forEach(DIALTEST_ENUM.KeyWordFilter, function(keyWord) {
                        if (item[keyWord] && item[keyWord].indexOf(keyword) != -1) {
                            confirm = true;
                            return false;
                        }
                    });
                    if (confirm) {
                        result.push(item);
                    }
                });
            }
            return result;
        }

        function collapseTableByTestcase(filterPageList, pageList, data, type) {
            var targetList = _.filter(pageList, function(item) {
                return (item.testcase_id == data.testcase_id || item.execution_id == data.execution_id) && item.key != data.key; //需要展开或折叠的项
            });
            var targetIndex = _.findIndex(pageList, function(item) {
                return item.key == data.key;
            });
            if (type == 'right') {  //折叠
                filterPageList.splice(targetIndex + 1, targetList.length);
            } else {  //展开
                _.forEach(targetList, function(target, index) {
                    filterPageList.splice(targetIndex + 1 + index, 0, target);
                });
            }
            return filterPageList;
        }
    }
})();
(function() {
    angular.module("charts")
        .factory("ChartsService", ChartsService);

    function ChartsService($q, $http) {
        var severities = [
            {
                id: 10,
                name: '严重'
            },
            {
                id: 0,
                name: '致命'
            },
            {
                id: 20,
                name: '一般'
            },
            {
                id: 30,
                name: '提示'
            }
        ];

        var service = {
            severities: severities,
            getChartOverview: getChartOverview,
            getChartDetail: getChartDetail,
            getScenarios: getScenarios
        }
        return service;

        function getChartOverview(appKey, params) {
            return $http.get("/api/app/" + appKey + "/report_system/overview/", {params: params}).then(function (res) {
                return res.data;
            });
        }
        
        function getChartDetail(appKey, params) {
            return $http.get("/api/app/" + appKey + "/report_system/detail/", {params: params}).then(function (res) {
                return res.data;
            });
        }

        function getScenarios(testcases) {
            var scenarios = [];
            var rootNode = testcases[0];
            _.forEach(testcases, function(testcase) {
                if (testcase.type == 1 && testcase.parent_id == rootNode.id) {  //只看第一级的场景
                    scenarios.push(testcase);
                }
            });
            return scenarios;
        }
    }
})();
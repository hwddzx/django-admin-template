(function() {

    angular.module('quail.report')
        .factory("ReportService", ReportService);

    function ReportService($rootScope, $q, $http, $uibModal, $state, config) {

        return {
            getReports: function(appId, pageNum) {
                return $http.get("/api/task/app/" + appId + "/report/v3/", {
                    params: {
                        page: pageNum
                    }
                }).then(function(res) {
                    return res.data;
                })
            },
            getExecutions: function(hashkey) {
                return $http.get("/api/task/report/" + hashkey + "/execution/").then(function(res) {
                    return res.data;
                })
            },
            refreshExecutionResult: function(hashkey, model) {
                return $http.put(" /api/task/execution/" + hashkey + "/", {
                    name: model.name,
                    result: model.result,
                    severity: model.severity,
                    desc: model.desc,
                    update_baseline: model.updateBaseline
                });
            },
            refreshExecutionsResult: function(taskId, model) {
                var params = {
                    execution_keys: model.execution_keys,
                    result: model.result,
                    severity: model.severity,
                    desc: model.desc,
                    update_baseline: model.updateBaseline
                }
                //值为null的参数不传
                _.forEach(params, function(value, key) {
                    if (!value && value !== 0) {
                        delete params[key];
                    }
                });
                return $http.post("/api/task/" + taskId + "/execution/result_edit/batch/v2/", params).then(function(res) {
                    return res.data;
                });
            },
            saveReport: function(appId, report) {
                return $http.post("/api/task/app/" + appId + "/report/v3/", report).then(function(res) {
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'UserAction',
                        eventAction: 'report-create',
                        eventLabel: report.name
                    });
                    return res.data;
                })
            }
        }

    }

}());

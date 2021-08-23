(function() {
    angular.module('quail.report')
        .factory("ReportDetailService", ReportDetailService)
        .factory("ReportDetailFilter", ReportDetailFilter);

    function ReportDetailService($http, ReportDetailFilter, $q) {
        var filteredExecutions = [],
            filters = {},
            service = {
                getReportDetail: function(hashkey) {
                    return $http.get("/api/task/report/" + hashkey + "/").then(function(res) {
                        return res.data;
                    })
                },
                getExecutions: function(hashkey) {
                    return $http.get("/api/task/report/" + hashkey + "/execution/").then(function(res) {
                        service.filters = _.merge(filters, ReportDetailFilter.initFilters(res.data));
                        return res.data;
                    })
                },
                getFilterExecution: function(executions) {
                    filteredExecutions = _.filter(_.clone(executions), function(execution) {
                        var res = true;
                        _.forEach(filters, function(filter, key) {
                            //过滤器
                            if (!filter.selected || filter.selected == "all") {
                                return true;
                            } else {
                                var filterValue = filter.data[filter.selected].value;
                                return res = filter.getValue(execution) == filterValue;
                            }
                        });
                        return res;
                    });

                    return filteredExecutions;
                }
            };
        return service;
    }

    function ReportDetailFilter() {
        var filtersTemplate = {
                result: {
                    getValue: function(obj) {
                        return obj.result
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    }
                },
                deviceName: {
                    getValue: function(obj) {
                        return obj.device.name;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    }
                },
                os: {
                    getValue: function(obj) {
                        return obj.device.os;
                    },
                    data: {
                        all: {
                            text: "全部"
                        }
                    }
                }
            },
            filters;
        return {
            initFilters: initFilters
        };

        function initFilters(executions) {
            filters = _.cloneDeep(filtersTemplate);
            _.forEach(filters, function(filter, key) {
                _.each(executions, function(execution) {
                    var value = filter.getValue(execution);
                    if (value && !filter.data[value]) {
                        filter.data[value] = {text: value, value: value}
                    }
                })
            });
            return filters
        }
    }
})();
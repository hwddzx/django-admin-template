(function() {
    angular.module("quail.app")
        .directive("appProgressChart", appProgressChart)
        .directive("executionProgressChart", executionProgressChart)
        .directive("patchedExecutionChart", patchedExecutionChart);

    function _chartInfo(detail) {
        var chartCount = 0,
            chartName = "";

        if (detail.completed_testcases > 0) {
            chartCount = detail.total_testcases == 0 ? "0%" : Math.floor(detail.completed_testcases / detail.total_testcases * 100) + "%";
            chartName = "已完成";
        } else if (detail.uncompleted_testcases) {
            chartCount = detail.total_testcases == 0 ? "0%" : Math.floor(detail.uncompleted_testcases / detail.total_testcases * 100) + "%";
            chartName = "未完成";
        }
        return {chartCount: chartCount || '', chartName: chartName || ''};
    }

    function appProgressChart() {
        return {
            restrict: 'A',
            scope: {app: "="},
            link: function(scope, element) {

                scope.$watch("app", _init);

                function _init() {
                    var detail = scope.app,
                        chartInfo = _chartInfo(detail),
                        seriesData = [],
                        colors = [];

                    if (detail.completed_testcases > 0) {
                        seriesData.push(["已完成: " + detail.completed_testcases, detail.completed_testcases]);
                        colors.push("#52bd8a");
                    }
                    if (detail.uncompleted_testcases > 0) {
                        seriesData.push(["未完成: " + detail.uncompleted_testcases, detail.uncompleted_testcases]);
                        colors.push("#f4f7fb");
                    }
                    element.highcharts({
                        chart: {
                            type: 'pie',
                            width: 150,
                            height: 150,
                            style: {overflow: 'visible'}
                        },
                        title: {
                            text: '<span class="chart-count">' + chartInfo.chartCount + '</span>',
                            verticalAlign: 'middle',
                            y: -10,
                            useHTML: true
                        },
                        subtitle: {
                            text: '<span class="chart-name">' + chartInfo.chartName + '</span>',
                            verticalAlign: 'middle',
                            useHTML: true
                        },
                        plotOptions: {
                            pie: {
                                point: {
                                    events: {
                                        legendItemClick: function() {
                                            return false;
                                        }
                                    }
                                },
                                innerSize: 70,
                                dataLabels: {
                                    enabled: false
                                },
                                showInLegend: true,
                                marker: {
                                    states: {
                                        hover: false
                                    }
                                },
                                colors: colors
                            },
                            series: {
                                allowPointSelect: false,
                                cursor: 'pointer'
                            }
                        },
                        tooltip: {
                            enabled: false
                        },
                        legend: {
                            align: 'right',
                            layout: 'vertical',
                            verticalAlign: 'top',
                            x: 140,
                            y: 50,
                            symbolWidth: 12,
                            symbolHeight: 12,
                            itemMarginBottom: 8,
                            itemStyle: {cursor: 'default'}
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        series: [{
                            data: seriesData,
                            keys: ['name', 'y']
                        }]
                    });
                }
            }
        }
    }

    function executionProgressChart() {
        return {
            restrict: 'A',
            scope: {app: "="},
            link: function(scope, element) {

                scope.$watch("app", _init);

                function _init() {
                    var app = scope.app,
                        html = '<div class="progress-item success" style="width:' + app.success_executions / app.total_executions * 100 + '%"></div>'
                            + '<div class="progress-item blocked" style="width:' + app.blocked_executions / app.total_executions * 100 + '%"></div>'
                            + '<div class="progress-item failed" style="width:' + app.failed_executions / app.total_executions * 100 + '%"></div>';

                    if (!app.total_executions) {
                        element.addClass("progress-no-data");
                    } else {
                        element.html(html);
                    }
                }
            }
        }
    }

    function patchedExecutionChart() {
        return {
            restrict: 'A',
            scope: {app: "="},
            link: function(scope, element) {

                scope.$watch("app", _init);

                function _init() {
                    var app = scope.app,
                        html = '<div class="progress-item patched" style="width:' + app.patched_executions / app.total_executions * 100 + '%"></div>';
                    if (!app.total_executions) {
                        element.addClass("progress-no-data");
                    } else {
                        element.html(html);
                    }
                }
            }
        }
    }

})();
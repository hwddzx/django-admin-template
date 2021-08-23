(function() {
    angular.module('quail.report')
        .directive("reportWithoutIssueChart", reportWithoutIssueChart)
        .directive("reportWithIssueMainChart", reportWithIssueMainChart)
        .directive("reportWithIssueFailedChart", reportWithIssueFailedChart)
        .directive("reportPerformanceChart", reportPerformanceChart)
        .directive("tbAngleUpDown", tbAngleUpDown)
        .directive("childToggleClass", childToggleClass)
        .directive("scenarioHistogram", scenarioHistogram)
        .directive("isOverflow", isOverflow);

    function _chartInfo(metrics) {
        var chartCount = 0,
            chartName = "";

        if (metrics.execution_failed_count > 0) {
            chartCount = metrics.execution_failed_count;
            chartName = "失败用例";
        } else if (metrics.execution_blocked_count > 0) {
            chartCount = metrics.execution_blocked_count;
            chartName = "阻塞用例";
        } else if (metrics.execution_success_count > 0) {
            chartCount = metrics.execution_success_count;
            chartName = "通过用例";
        }
        return {chartCount: chartCount || '', chartName: chartName || ''};
    }

    function reportWithoutIssueChart() {
        return {
            restrict: 'A',
            link: function(scope, element) {

                var metrics = scope.reportDetail.metrics,
                    chartInfo = _chartInfo(metrics);

                element.highcharts({
                    chart: {
                        type: 'pie',
                        width: 300,
                        height: 300,
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
                            innerSize: 190,
                            dataLabels: {
                                enabled: false
                            },
                            showInLegend: true,
                            marker: {
                                states: {
                                    hover: false
                                }
                            },
                            colors: ["#fa575f", "#fcc24a", "#52bf8a"]
                        },
                        series: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            point: {
                                events: {
                                    click: function(e) {
                                        element.find(".chart-count").html(this.y)
                                            .end().find(".chart-name").html(this.name);
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        enabled: false
                    },
                    legend: {
                        align: 'right',
                        layout: 'vertical',
                        verticalAlign: 'top',
                        x: 400,
                        y: 155,
                        symbolWidth: 12,
                        symbolHeight: 12,
                        itemMarginBottom: 15,
                        itemStyle: {cursor: 'default'}
                    },
                    credits: {
                        enabled: false
                    },
                    exporting: {
                        enabled: false
                    },
                    series: [{
                        data: [
                            ["失败用例", metrics.execution_failed_count],
                            ["阻塞用例", metrics.execution_blocked_count],
                            ["通过用例", metrics.execution_success_count]
                        ],
                        keys: ['name', 'y']
                    }]
                });
            }
        }
    }

    function reportWithIssueMainChart() {
        return {
            restrict: 'A',
            link: function(scope, element) {

                var metrics = scope.reportDetail.metrics,
                    chartInfo = _chartInfo(metrics),
                    seriesData = [],
                    colors = [];

                if (metrics.execution_failed_count > 0) {
                    seriesData.push(["失败用例", metrics.execution_failed_count]);
                    colors.push("#fa575f");
                }
                if (metrics.execution_blocked_count > 0) {
                    seriesData.push(["阻塞用例", metrics.execution_blocked_count]);
                    colors.push("#fcc24a");
                }
                if (metrics.execution_success_count > 0) {
                    seriesData.push(["成功用例", metrics.execution_success_count]);
                    colors.push("#52bf8a");
                }
                element.highcharts({
                    chart: {
                        type: 'pie',
                        width: 250,
                        height: 250,
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
                            innerSize: 150,
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
                            allowPointSelect: true,
                            cursor: 'pointer',
                            point: {
                                events: {
                                    click: function(e) {
                                        element.find(".chart-count").html(this.y)
                                            .end().find(".chart-name").html(this.name);
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        enabled: false
                    },
                    legend: {
                        align: 'right',
                        layout: 'vertical',
                        verticalAlign: 'top',
                        x: 150,
                        y: 105,
                        symbolWidth: 12,
                        symbolHeight: 12,
                        itemMarginBottom: 15,
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

    function reportWithIssueFailedChart() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var metrics = scope.reportDetail.metrics,
                    chartCount = 0,
                    chartName = "";
                if (metrics.severity_fatal_count > 0) {
                    chartCount = metrics.severity_fatal_count;
                    chartName = "致命";
                } else if (metrics.severity_critical_count > 0) {
                    chartCount = metrics.severity_critical_count;
                    chartName = "严重";
                } else if (metrics.severity_normal_count > 0) {
                    chartCount = metrics.severity_normal_count;
                    chartName = "一般";
                } else if (metrics.severity_minor_count > 0) {
                    chartCount = metrics.severity_minor_count;
                    chartName = "提示";
                }

                element.highcharts({
                    chart: {
                        type: 'pie',
                        width: 250,
                        height: 250,
                        style: {overflow: 'visible'}
                    },
                    title: {
                        text: '<span class="chart-count">' + chartCount + '</span>',
                        verticalAlign: 'middle',
                        y: -10,
                        useHTML: true
                    },
                    subtitle: {
                        text: '<span class="chart-name">' + chartName + '</span>',
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
                            innerSize: 150,
                            dataLabels: {
                                enabled: false
                            },
                            showInLegend: true,
                            marker: {
                                states: {
                                    hover: false
                                }
                            },
                            colors: ["#fa575f", "#ff7e00", "#fdC42c", "#fee080"]
                        },
                        series: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            point: {
                                events: {
                                    click: function(e) {
                                        element.find(".chart-count").html(this.y)
                                            .end().find(".chart-name").html(this.name);
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        enabled: false
                    },
                    legend: {
                        align: 'right',
                        layout: 'vertical',
                        verticalAlign: 'top',
                        x: 135,
                        y: 75,
                        symbolWidth: 12,
                        symbolHeight: 12,
                        itemMarginBottom: 15,
                        itemStyle: {cursor: 'default'}
                    },
                    credits: {
                        enabled: false
                    },
                    exporting: {
                        enabled: false
                    },
                    series: [{
                        data: [
                            ["致命", metrics.severity_fatal_count],
                            ["严重", metrics.severity_critical_count],
                            ["一般", metrics.severity_normal_count],
                            ["提示", metrics.severity_minor_count]
                        ],
                        keys: ['name', 'y']
                    }]
                });
            }
        }
    }

    function reportPerformanceChart($filter) {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'line'
                        },
                        title: {
                            text: null
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        legend: {
                            enabled: false
                        },
                        xAxis: {
                            type: 'datetime',
                            gridLineWidth: 0
                        },
                        yAxis: vm.yAxisArray,
                        plotOptions: {
                            line: {
                                dataLabels: {
                                    enabled: false
                                }
                            },
                            series: {
                                lineWidth: 2,
                                allowPointSelect: true,
                                cursor: 'pointer',
                                point: {
                                    events: {
                                        mouseOver: vm.mouseOverFn
                                    }
                                },
                                marker: {
                                    enabled: false
                                }
                            }
                        },
                        tooltip: {
                            shared: true,
                            borderColor: '#fff',
                            formatter: function() {
                                var tooltip = '';
                                _.each(this.points, function(point, i, points) {
                                    tooltip += '<b style="font-weight:900;color:' + point.color + '">一 </b>' + point.y + point.series.tooltipOptions.unit + '<br/>';
                                });
                                tooltip += '<i>  ' + $filter('date')(this.x, 'yyyy-MM-dd HH:mm:ss') + "<br/>" + '</i>';
                                return tooltip;
                            },
                            crosshairs: [true, false]
                        },
                        series: vm.series
                    });
                    vm.chart = element.highcharts();
                };
                vm.drawChart();
            }
        }
    }

    function tbAngleUpDown() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                element.on("click", function() {
                    element.find(".angle").toggleClass("fa-angle-down fa-angle-up");
                });
            }
        }
    }

    function childToggleClass() {
        return {
            restrict: 'A',
            link: function(scope, element, attr) {
                var toggleClass = attr['childToggleClass'];
                element.on('click', 'li', function() {
                    $(this).addClass(toggleClass).siblings('.' + toggleClass).removeClass(toggleClass);
                })
            }
        }
    }

    function scenarioHistogram() {
        return {
            restrict: 'A',
            scope:{
                value:'@',
                longestScenarioTotal:'@'
            },
            link: function (scope, element, attributes) {
                if (!parseInt(scope.value)) {
                    return;
                }
                var width = scope.value / (scope.longestScenarioTotal || 1) * 100 + '%',
                    tooltip = "<span class='prompt-box'>" + scope.value + "</span>";
                element.append(tooltip);
                element.css("width", width).hover(function() {
                        element.find('.prompt-box').fadeIn();
                    },function() {
                        element.find('.prompt-box').fadeOut();
                    });
            }
        }
    }

    function isOverflow() {
        return {
            restrict: 'A',
            link: function(scope, ele) {
                scope.$watch(function() {
                    return ele[0].scrollWidth > ele[0].clientWidth || ele[0].clientWidth == parseInt($(ele[0]).css("max-width").replace(/px/, "")) || ele[0].scrollHeight > ele[0].clientHeight
                }, function(newVal) {
                    if (newVal) {
                        ele.addClass('overflowed');
                    } else {
                        ele.removeClass('overflowed');
                    }
                })
            }
        }
    }



})();
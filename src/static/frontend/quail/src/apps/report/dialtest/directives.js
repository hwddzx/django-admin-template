(function() {
    angular.module('quail.report')
        .directive("dialtestFunctestPass", dialtestFunctestPass)
        .directive("dialtestFunctestRun", dialtestFunctestRun)
        .directive("dialtestFunctestTime", dialtestFunctestTime)
        .directive("dialtestDatacheckPass", dialtestDatacheckPass)
        .directive("dialtestDatacheckRun", dialtestDatacheckRun)
        .directive("dialtestDatacheckTime", dialtestDatacheckTime)
        .directive("dialtestFunctestScenario", dialtestFunctestScenario)
        .directive("dialtestDatacheckScenario", dialtestDatacheckScenario)
        .directive("dialtestFunctestPassLine", dialtestFunctestPassLine)
        .directive("dialtestFunctestExceptionLine", dialtestFunctestExceptionLine)
        .directive("dialtestDatacheckExceptionLine", dialtestDatacheckExceptionLine)
        .directive("dialtestDatacheckReport", dialtestDatacheckReport)
        .directive("dialtestFunctestReport", dialtestFunctestReport);

    function dialtestFunctestPass() {
        return {
            restrict: 'A',
            link: function(scope, element) {

                var vm = scope.vm;

                vm.drawDialtestFunctestPass = function() {
                    element.highcharts({
                        chart: {
                            spacing: [40, 0, 40, 0]
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        title: {
                            floating: true,
                            text: vm.functestPassTitle,
                            y: 110,
                            x: -65
                        },
                        tooltip: {
                            pointFormat: '占比: <b>{point.percentage:.2f}%{point.category}</b>'
                        },
                        legend: {
                            align: 'right',
                            layout: 'vertical',
                            y: -100
                        },
                        plotOptions: {
                            pie: {
                                allowPointSelect: true,
                                cursor: 'pointer',
                                dataLabels: {
                                    enabled: false
                                },
                                showInLegend: true
                            }
                        },
                        series: [{
                            type: 'pie',
                            innerSize: '60%',
                            name: '通过率',
                            data: vm.functestPassSeries
                        }]
                    });
                }
                vm.drawDialtestFunctestPass();
            }
        };
    }

    function dialtestFunctestRun() {
        return {
            restrict: 'A',
            link: function(scope, element) {

                var vm = scope.vm;

                vm.drawDialtestFunctestRun = function() {
                    element.highcharts({
                        chart: {
                            type: 'column'
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
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
                        plotOptions: {
                            column: {
                                pointPadding: 0.2,
                                borderWidth: 0,
                                pointWidth: 30,
                                dataLabels: {
                                    enabled: true,
                                }
                            }
                        },
                        xAxis: {
                            type: 'category',
                            categories: ["用例通过数", "用例失败数", "用例阻塞数"]
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            name: "用例数",
                            data: vm.functestRunSeries
                        }]
                    });
                };
                vm.drawDialtestFunctestRun();
            }
        }
    }

    function dialtestFunctestTime() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestFunctestTime = function() {
                    element.highcharts({
                        chart: {
                            type: 'area',
                            marginTop: 25
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
                        title: {
                            text: "<div style='background-color:#ebf2fc;width:900px;height:36px;padding-top:5px;padding-left:10px;'>拨测时间线</div>",
                            useHTML: true,
                            align: 'high',
                            x: -10,
                            y: 7
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        legend: {
                            align: 'right',
                            x: 20,
                            verticalAlign: 'top',
                            y: -10,
                            floating: true,
                            backgroundColor: '#ebf2fc',
                            width: 240,
                            maxHeight: 28,
                            lineHeight: 28,
                            padding: 13
                        },
                        tooltip: {
                            shared: true
                        },
                        xAxis: {
                            type: 'category',
                            categories: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"]
                        },
                        yAxis: {
                            title: {
                                align: 'high',
                                offset: 0,
                                text: '数量',
                                rotation: 0,
                                y: -10
                            },
                            min: 0,
                            minRange: 1
                        },
                        series: vm.functestTimeSeries
                    });
                }
                vm.drawDialtestFunctestTime();
            }
        }
    }

    function dialtestDatacheckPass() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestDatacheckPass = function() {
                    element.highcharts({
                        chart: {
                            spacing: [40, 0, 40, 0]
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        title: {
                            floating: true,
                            text: vm.datacheckPassTitle,
                            y: 110,
                            x: -55
                        },
                        legend: {
                            align: 'right',
                            layout: 'vertical',
                            y: -100
                        },
                        tooltip: {
                            pointFormat: '占比: <b>{point.percentage:.2f}%</b>'
                        },
                        plotOptions: {
                            pie: {
                                allowPointSelect: true,
                                cursor: 'pointer',
                                dataLabels: {
                                    enabled: false
                                },
                                showInLegend: true
                            }
                        },
                        series: [{
                            type: 'pie',
                            innerSize: '60%',
                            name: '通过率',
                            data: vm.datacheckPassSeries
                        }]
                    });
                };
                vm.drawDialtestDatacheckPass();
            }
        };
    }

    function dialtestDatacheckRun() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestDatacheckRun = function() {
                    element.highcharts({
                        chart: {
                            type: 'column'
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
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
                        plotOptions: {
                            column: {
                                pointPadding: 0.2,
                                borderWidth: 0,
                                pointWidth: 30,
                                dataLabels: {
                                    enabled: true,
                                }
                            }
                        },
                        xAxis: {
                            type: 'category',
                            categories: ["通过数", "失败数"]
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            name: "用例数",
                            data: vm.datacheckRunSeries
                        }]
                    });
                };
                vm.drawDialtestDatacheckRun();
            }
        };
    }

    function dialtestDatacheckTime() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestDatacheckTime = function() {
                    element.highcharts({
                        chart: {
                            type: 'area',
                            marginTop: 25
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
                        title: {
                            text: "<div style='background-color:#ebf2fc;width:900px;height:36px;padding-top:5px;padding-left:10px;'>拨测时间线</div>",
                            useHTML: true,
                            align: 'high',
                            x: -10,
                            y: 7
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        legend: {
                            align: 'right',
                            x: 20,
                            verticalAlign: 'top',
                            y: -10,
                            floating: true,
                            backgroundColor: '#ebf2fc',
                            width: 240,
                            maxHeight: 30,
                            lineHeight: 30,
                            padding: 13
                        },
                        tooltip: {
                            shared: true
                        },
                        xAxis: {
                            type: 'category',
                            categories: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"]
                        },
                        yAxis: {
                            title: {
                                align: 'high',
                                offset: 0,
                                text: '数量',
                                rotation: 0,
                                y: -10
                            },
                            min: 0,
                            minRange: 5
                        },
                        series: vm.datacheckTimeSeries
                    });
                };
                vm.drawDialtestDatacheckTime();
            }
        };
    }

    function dialtestFunctestScenario() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestFunctestScenario = function() {
                    var title = "用例运行总数：" + vm.testcaseRunAll + "条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;通过数：" + vm.testcaseRunSuccess + "条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;失败数：" + vm.testcaseRunFailed + "条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;阻塞：" + vm.testcaseRunBlocked + "条";
                    element.highcharts({
                        chart: {
                            type: 'column'
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
                        title: {
                            text: "<div style='background-color:#ebf2fc;width:900px;height:36px;padding-top:9px;padding-left:10px;'>" + title + "</div>",
                            useHTML: true,
                            align: 'high',
                            x: -10,
                            y: 7,
                            style: {
                                fontWeight: 'normal',
                                fontSize: '12px'
                            }
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        legend: {
                            align: 'right',
                            x: 20,
                            verticalAlign: 'top',
                            y: -5,
                            floating: true,
                            backgroundColor: '#ebf2fc',
                            width: 240,
                            maxHeight: 30,
                            lineHeight: 30,
                            padding: 13
                        },
                        plotOptions: {
                            column: {
                                borderWidth: 0,
                                pointWidth: 20,
                                dataLabels: {
                                    enabled: true,
                                }
                            }
                        },
                        tooltip: {
                            shared: true
                        },
                        xAxis: {
                            type: 'category',
                            categories: vm.scenarioCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null,
                            },
                            min: 0,
                            minRange: 4,
                            minTickInterval: 1
                        },
                        series: vm.functestScenarioSeries
                    });
                };
                vm.drawDialtestFunctestScenario();
            }
        };
    }

    function dialtestDatacheckScenario() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestDatacheckScenario = function() {
                    var title = "检查运行总数：" + vm.datacheckRunAll + "条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;成功数：" + vm.datacheckRunSuccess + "条&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;失败数：" + vm.datacheckRunFailed + "条";
                    element.highcharts({
                        chart: {
                            type: 'column'
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
                        title: {
                            text: "<div style='background-color:#ebf2fc;width:900px;height:36px;padding-top:9px;padding-left:10px;'>" + title + "</div>",
                            useHTML: true,
                            align: 'high',
                            x: -10,
                            y: 7,
                            style: {
                                fontWeight: 'normal',
                                fontSize: '12px'
                            }
                        },
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        legend: {
                            align: 'right',
                            x: 20,
                            verticalAlign: 'top',
                            y: -5,
                            floating: true,
                            backgroundColor: '#ebf2fc',
                            width: 240,
                            maxHeight: 30,
                            lineHeight: 30,
                            padding: 13
                        },
                        tooltip: {
                            shared: true
                        },
                        plotOptions: {
                            column: {
                                pointPadding: 0.2,
                                borderWidth: 0,
                                pointWidth: 30,
                                dataLabels: {
                                    enabled: true,
                                }
                            }
                        },
                        xAxis: {
                            type: 'category',
                            categories: vm.scenarioCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null,
                            },
                            min: 0,
                            minRange: 4,
                            minTickInterval: 1
                        },
                        series: vm.datacheckScenarioSeries
                    });
                };
                vm.drawDialtestDatacheckScenario();
            }
        };
    }

    function dialtestFunctestPassLine() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawFunctestPassLine = function() {
                    element.highcharts({
                        chart: {
                            type: 'line',
                            marginTop: 25
                        },
                        title: {
                            text: '',
                            verticalAlign: 'bottom',
                            style: {
                                "fontSize": '12px'
                            }
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
                            type: 'category',
                            categories: vm.functestPassLineCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null
                            },
                            min: 0,
                            max: 1,
                            minRange: 1,
                        },
                        series: [{
                            name: '通过率',
                            data: vm.functestPassLineSeries
                        }]
                    });
                };
                vm.drawFunctestPassLine();
            }
        };
    }

    function dialtestFunctestExceptionLine() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawFunctestExceptionLine = function() {
                    element.highcharts({
                        chart: {
                            type: 'line',
                            marginTop: 25
                        },
                        title: {
                            text: '',
                            verticalAlign: 'bottom',
                            style: {
                                "fontSize": '12px'
                            }
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
                            type: 'category',
                            categories: vm.functestExceptionLineCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null
                            },
                            min: 0,
                            minRange: 1
                        },
                        series: [{
                            name: '问题数',
                            data: vm.functestExceptionLineSeries
                        }]
                    });
                };
                vm.drawFunctestExceptionLine();
            }
        };
    }

    function dialtestDatacheckExceptionLine() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDatacheckExceptionLine = function() {
                    element.highcharts({
                        chart: {
                            type: 'line',
                            marginTop: 25
                        },
                        title: {
                            text: '',
                            verticalAlign: 'bottom',
                            style: {
                                "fontSize": '12px'
                            }
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
                            type: 'category',
                            categories: vm.datacheckExceptionLineCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null,
                            },
                            min: 0,
                            minRange: 1
                        },
                        series: [{
                            name: '问题数',
                            data: vm.datacheckExceptionLineSeries
                        }]
                    });
                };
                vm.drawDatacheckExceptionLine();
            }
        };
    }

    function dialtestDatacheckReport() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestDatacheckReport = function() {
                    element.highcharts({
                        chart: {
                            type: 'column'
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
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
                        tooltip: {
                            shared: true
                        },
                        plotOptions: {
                            column: {
                                dataLabels: {
                                    enabled: true,
                                }
                            }
                        },
                        xAxis: {
                            type: 'category',
                            categories: vm.scenarioCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null,
                            },
                            min: 0,
                            minRange: 4,
                            minTickInterval: 1
                        },
                        series: vm.datacheckReportSeries
                    });
                };
                vm.drawDialtestDatacheckReport();
            }
        };
    }

    function dialtestFunctestReport() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDialtestFunctestReport = function() {
                    element.highcharts({
                        chart: {
                            type: 'column'
                        },
                        colors: ['#0B70F0', '#EF5A5B', '#FFCB18'],
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
                        tooltip: {
                            shared: true
                        },
                        plotOptions: {
                            column: {
                                dataLabels: {
                                    enabled: true,
                                }
                            }
                        },
                        xAxis: {
                            type: 'category',
                            categories: vm.scenarioCategories,
                            crosshair: true
                        },
                        yAxis: {
                            title: {
                                text: null,
                            },
                            min: 0,
                            minRange: 4,
                            minTickInterval: 1
                        },
                        series: vm.functestReportSeries
                    });
                };
                vm.drawDialtestFunctestReport();
            }
        };
    }

})();
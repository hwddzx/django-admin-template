(function() {
    angular.module('charts')
        .directive("chartScript", chartScript)
        .directive("chartPass", chartPass)
        .directive("chartExceptions", chartExceptions)
        .directive("chartFileSize", chartFileSize)
        .directive("chartInstallDelay", chartInstallDelay)
        .directive("chartStartDelay", chartStartDelay)
        .directive("chartDataTraffic", chartDataTraffic)
        .directive("chartCpu", chartCpu)
        .directive("chartMemory", chartMemory);

    function chartScript() {
        return {
            restrict: 'A',
            link: function(scope, element) {

                var vm = scope.vm;

                vm.drawScriptChart = function() {
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                align: 'high',
                                offset: 0,
                                text: '脚本总数',
                                rotation: 0,
                                y: -10
                            },
                            min: 0,
                            minRange: 1
                        },
                        series: [{
                            name: '脚本数',
                            data: vm.scriptChartSeries
                        }]
                    });
                }
                vm.drawScriptChart();
            }
        };
    }

    function chartPass() {
        return {
            restrict: 'A',
            link: function(scope, element) {

                var vm = scope.vm;

                vm.drawPassChart = function() {
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                align: 'high',
                                offset: 0,
                                text: '测试通过率',
                                rotation: 0,
                                y: -10
                            },
                            min: 0,
                            max: 100,
                            minRange: 1
                        },
                        series: [{
                            name: '通过率',
                            tooltip: {
                                valueSuffix: "%"
                            },
                            data: vm.passChartSeries
                        }]
                    });
                };
                vm.drawPassChart();
            }
        }
    }

    function chartExceptions() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawExceptionsChart = function() {
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                align: 'high',
                                offset: 0,
                                text: '问题数',
                                rotation: 0,
                                y: -10
                            },
                            min: 0,
                            minRange: 1
                        },
                        series: [{
                            name: '问题数',
                            data: vm.exceptionsChartSeries
                        }]
                    });
                }
                vm.drawExceptionsChart();
            }
        }
    }

    function chartFileSize() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawFileSizeChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'bar'
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            data: vm.fileSizeChartSeries
                        }]
                    });
                };
                vm.drawFileSizeChart();
            }
        };
    }

    function chartInstallDelay() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawInstallDelayChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'bar'
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            data: vm.installDelayChartSeries
                        }]
                    });
                };
                vm.drawInstallDelayChart();
            }
        };
    }

    function chartStartDelay() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawStartDelayChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'bar'
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            data: vm.startDelayChartSeries
                        }]
                    });
                };
                vm.drawStartDelayChart();
            }
        };
    }

    function chartDataTraffic() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawDataTrafficChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'bar'
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            data: vm.dataTrafficChartSeries
                        }]
                    });
                };
                vm.drawDataTrafficChart();
            }
        };
    }

    function chartCpu() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawCpuChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'bar'
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            data: vm.cpuChartSeries
                        }]
                    });
                };
                vm.drawCpuChart();
            }
        };
    }

    function chartMemory() {
        return {
            restrict: 'A',
            link: function(scope, element) {
                var vm = scope.vm;

                vm.drawMemoryChart = function() {
                    element.highcharts({
                        chart: {
                            type: 'bar'
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
                            type: 'category'
                        },
                        yAxis: {
                            title: {
                                text: null,
                            }
                        },
                        series: [{
                            data: vm.memoryChartSeries
                        }]
                    });
                };
                vm.drawMemoryChart();
            }
        };
    }

})();
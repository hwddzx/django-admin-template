(function() {
    angular.module('report_v2').controller('reportPerformanceCtrlV2', reportPerformanceCtrl);

    function reportPerformanceCtrl($scope, $stateParams, performance, $state, $translate, config) {
        var vm = this;
        vm.performance = performance;
        vm.taskKey = $stateParams.key;
        vm.btn = [];
        vm.hasMoreOptimizeList = vm.performance.optimize_subtypes.length == 8;
        //optimize_subtypes下的name和code有些地方不需要用到单位，用以去掉;
        // 例如code: "Data Traffic (bps)"->"Data Traffic";name: "流量[kb]"->"流量"
        var removeParenthesis = function(str, m) {
            str = str.split(m);
            if (str.length > 1) {
                str.pop();
            }
            str = str.join();
            return str;
        };

        var _init = function() {
            //将optimize_subtypes数据按要求排序
            var optimizeList = [
                "Booting Delay ",
                "CPU Utilization ",
                "Internal Storage Utilization ",
                "Data Traffic ",
                "Temperature "
            ];

            vm.optimize_subtypes = [];
            _.each(optimizeList, function(value, i) {
                _.each(vm.performance.optimize_subtypes, function(vmValue) {
                    var code = removeParenthesis(vmValue.code, "(");
                    if (value === code) {
                        vm.optimize_subtypes.push(vmValue);
                        vm.optimize_subtypes[i].newcode = removeParenthesis(vm.optimize_subtypes[i].code, '(');
                        vm.optimize_subtypes[i].iconcode = vm.optimize_subtypes[i].newcode;
                        vm.optimize_subtypes[i].newname = removeParenthesis(removeParenthesis(vm.optimize_subtypes[i].name, '('), '[');
                    }
                });
            });

            if (vm.hasMoreOptimizeList) {
                var moreOptimizeList = [
                    'Battery Usage ',
                    'GPU Utilization ',
                    'Frame Rate '
                ];

                 _.each(moreOptimizeList, function(value, i) {
                     //添加到之前5组数据之后
                     i += 5;
                     _.each(vm.performance.optimize_subtypes, function (vmValue) {
                         var code = removeParenthesis(vmValue.code, "(");
                         if (value === code) {
                             vm.optimize_subtypes.push(vmValue);
                             vm.optimize_subtypes[i].newcode = removeParenthesis(vm.optimize_subtypes[i].code, '(');
                             vm.optimize_subtypes[i].iconcode = vm.optimize_subtypes[i].newcode;
                             vm.optimize_subtypes[i].newname = removeParenthesis(removeParenthesis(vm.optimize_subtypes[i].name, '('), '[');
                         }
                     });
                 });
            }

            vm.refreshList("Booting Delay ");
        };

        //如果是n位以上小数保留n位小数，否则为原值
        vm.toFixed = function(number, n) {
            if (parseInt(number * Math.pow(10, n)) === number * Math.pow(10, n)) {
                return number;
            } else {
                return number.toFixed(n);
            }
        };

        vm.refreshList = function(code) {
            _.each(vm.optimize_subtypes, function(value) {
                if (code === value.newcode) {
                    var xTitle = '';
                    vm.btn[value.newcode] = "check";

                    //需要排序 top5List要为数组
                    vm.topFiveList = [];
                    _.each(value.top_devices, function(val) {
                        vm.topFiveList.push(val);
                    });
                    _.each(vm.topFiveList, function(val) {
                        vm.topFiveSequence = "-data";
                        if (code === "Booting Delay " || code === "Install Delay ") {
                            val.data = val.i_boot_delay;
                            xTitle = 'ms';
                        } else if (code === "CPU Utilization ") {
                            val.data = val.i_cpu_utilization;
                            xTitle = '%';
                        } else if (code === "GPU Utilization ") {
                            val.data = val.i_gpu_utilization;
                            xTitle = '%';
                        } else if (code === "Frame Rate ") {
                            val.data = val.i_frame_rate;
                            xTitle = 'fps';
                            vm.topFiveSequence = "data";
                        } else if (code === "Internal Storage Utilization ") {
                            val.data = val.i_mem_utilization;
                            xTitle = 'kb';
                        } else if (code === "Data Traffic ") {
                            val.data = val.i_data_traffic / 1024;
                            xTitle = 'kb';
                        } else if (code === "Battery Usage ") {
                            val.data = val.i_battery_usage;
                            xTitle = 'mAh';
                        } else if (code === "Temperature ") {
                            val.data = val.i_temperature;
                            xTitle = '°C';
                        } else if (code === "Frame Rate ") {
                            val.data = val.i_temperature;
                            xTitle = 'fps';
                        }
                    });
                    vm.list_name = value.listname || value.name;
                    vm.optimize_subtype_name = removeParenthesis(vm.list_name, '[');
                    vm.list_coverage = value.coverage;
                    var arr = [];
                    _.each(vm.performance.performance_distributions, function(val) {
                        if (val[2] === value.code) {
                            arr.push(val);
                        }
                    });
                    $('#pie-con').highcharts({
                        chart: {
                            type: 'column'
                        },
                        legend: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                        plotOptions: {
                            series: {
                                stacking: "",
                                pointWidth: 40,
                                color: 'rgba(0, 112, 240, 0.5)',
                                dataLabels: {
                                    enabled: true,
                                    format: '{y}台',
                                    style: {
                                        fontWeight: 'thin'
                                    }
                                }
                            }
                        },
                        xAxis: {
                            categories: []
                        },
                        yAxis: {
                            title: {
                                text: ''
                            },
                            min: 0
                        },
                        tooltip: {
                            enabled: false
                        },
                        title: {
                            text: ""
                        },
                        series: [{
                            name: '',
                            data: arr
                        }],
                        credits: {
                            enabled: false
                        },
                        exporting: {
                            enabled: false
                        },
                    });
                } else {
                    vm.btn[value.newcode] = "uncheck";
                }
            });
        };

        _init();

    }
})();

(function() {
    angular.module('report_v2')
        .controller("subtaskDetailCtrl", subtaskDetailCtrl)
        .controller("performanceCtrl", performanceCtrl)
        .controller("logsCtrl", logsCtrl);

    function subtaskDetailCtrl($rootScope, $scope, $stateParams, $state, $filter, subtasks, subtaskDetail, config) {
        var vm = this;

        vm.rioEnabled = config.rioEnabled;
        vm.isOffline = config.isOffline;
        vm.snapshotsLoadTotal = 10;

        vm.subtaskDetail = subtaskDetail;

        vm.hasSubtaskDetailImage = vm.subtaskDetail.images.length > 0;

        vm.canRent = vm.subtaskDetail.device_model.rio && vm.subtaskDetail.device_model.rio.status == 0;
        vm.childStateName = "报告详情";
        vm.isApp = (vm.subtaskDetail.test_app_type == 'app');

        $rootScope.appName = vm.subtaskDetail.name;

        vm.subtasks = _.filter(subtasks, {is_passed: false});
        vm.currentSubtaskKey = $stateParams.subtaskKey;
        vm.exceptionDetails = [];
        //多个问题需要过滤的性能数据问题的id
        //1-执行成功，11-流量，12-启动时延，13-CPU占用，14-内存占用，15-IO等待率，16-温度，17-帧速率，51-GPU占用率，52-耗电量
        vm.performanceSubtypesIds = [1,11,12,13,14,15,16,17,51,52];

        // vm.rent = function() {
        //     var newWindow = window.open("");
        //     taskService.rentDevice(vm.subtaskDetail.id).then(function(res) {
        //         newWindow.location.href = res.data.url;
        //     }, function() {
        //         newWindow.close();
        //     });
        // };

        var images = _.map(vm.subtaskDetail.images, function(image) {
            return { href: image.filePath, title: image.time, helpers: { title: { type: 'inside' } } }
        });

        var filterPerformanceSubtypes = [];
        _.forEach(vm.subtaskDetail.result_subtype_json,function (o) {
            if(vm.performanceSubtypesIds.indexOf(o.id) == -1){
                filterPerformanceSubtypes.push(o)
            }
        });

        _.forEach(filterPerformanceSubtypes, function(o){
            vm.exceptionDetails.push({
                os: vm.subtaskDetail.device_model.os,
                type: o.name,
                desc: o.desc,
                image: o.images ? o.images[0] : '',
                performance: searchPerformance(o.images ? o.images[0] : '')
            })
        })

        function searchPerformance(imageUrl) {
            if(!imageUrl){return ''}
            var exceptionImageIndex = _.findIndex(images, {"href": imageUrl});
            if (exceptionImageIndex >= 0) {
                vm.exceptionImage = images[exceptionImageIndex];
                var exceptionPerformanceIndex = _.min([_.sortedIndexBy(vm.subtaskDetail.performances, {time: vm.exceptionImage.title}, 'time'), vm.subtaskDetail.performances.length - 1]);
                vm.exceptionPerformance = _.clone(vm.subtaskDetail.performances[exceptionPerformanceIndex]);
                vm.exceptionPerformance = _.merge(vm.exceptionPerformance, {imageTime:vm.exceptionImage.title});
                _.each(vm.exceptionPerformance, function (value, key) {
                    if (key == 'totalFlow' || key == 'systemRamAvailable') {
                        value = value / 1024;
                        vm.exceptionPerformance[key] = value >= 1 ? Math.floor(value) : parseFloat(value.toFixed(2))
                    } else if (key == 'cpu') {
                        vm.exceptionPerformance[key] = parseFloat(value).toFixed(2);
                    }
                })
            }
            return vm.exceptionPerformance;
        }

        vm.showFancybox = function(currentIndex) {
            $.fancybox(images, {
                index: currentIndex,
                loop: false
            });
        };

        vm.showExceptionFancybox = function (image) {
            $.fancybox(image);
        };

        vm.gotoExceptionSnapshot = function(imageSrc) {
            var exceptionImageIndex = _.findIndex(images, {"href": imageSrc});
            var columnCount = 5;
            vm.rowNumber = Math.ceil((exceptionImageIndex + 1) / columnCount);
            vm.snapshotsLoadTotal = vm.rowNumber * columnCount;
            if ($state.current.target != 'Snapshots') {
                //不在在snapshots页面则跳转到该页面
                vm.isScrollToExceptionSnapshot = true;
                $state.go("subtaskDetail.snapshots");
            } else {
                $scope.$broadcast('toSnapshots');
            }
        }

        vm.gotoExceptionLog = function() {
            if ($state.current.target != 'Logs') {
                //不在在logs页面则先跳转到该页面
                $state.go("subtaskDetail.logs", {
                    'isGoToExceptionLogLine': true
                });
            } else {
                $scope.$broadcast('logs.loadingExceptionLog');
            }
        }

    }

    function performanceCtrl($scope, $timeout, $location, $anchorScroll, $filter) {
        var vm = this,
            hasPlotLine = false,
            lastIndex = 0,
            moveImageCount = 1; // 点击前进或后退按钮替换的图片张数


        vm.subtaskDetail = $scope.vm.subtaskDetail;
        vm.exceptionPerformanceIndex = undefined;

        //与旧版没有gpuEnabled和batteryEnabled的数据兼容
        if (vm.subtaskDetail.performances.length && vm.subtaskDetail.performances[0].hasOwnProperty("gpuUsage")) {
            vm.gpuEnabled = true;
            //性能曲线显示电量
            vm.batteryEnabled = true;
        }

        vm.images = [];
        // 性能警告
        // WARNING_THRESHOLD = (('fps', 30, 999), ('ram', 0, 128 * 1024), ('cpu', 0, 69))
        vm.warnings = [{
            key: "cpu",
            name: "CPU",
            target: "CPU",
            avg: 0,
            max: 0,
            min: 0,
            unit: "%",
            isAlarm: function(item) {
                return item > 69;
            },
            handle: function(target) {
                _warningHandle(target)
            }
        }, {
            key: "ram",
            name: "内存",
            target: "Memory",
            avg: 0,
            max: 0,
            min: 0,
            unit: "MB",
            isAlarm: function(item) {
                return item > 128;
            },
            handle: function(target) {
                _warningHandle(target)
            }
        }, {
            key: "fps",
            name: "帧速率",
            target: "Frame",
            avg: 0,
            max: 0,
            min: 0,
            unit: "fps",
            isAlarm: function(item) {
                return item > 999 || item < 30;
            },
            handle: function(target) {
                _warningHandle(target)
            }
        }];

        // 性能图性能指标可选按钮组
        vm.warningObject = {
            CPU: true,
            Memory: true,
            AvailableMemory: true,
            Frame: true,
            Temperature: true,
            DataTraffic: true,
            gpuUsage: true,
            batteryUsage: true
        };

        vm.prevSnapshot = prevSnapshot;
        vm.nextSnapshot = nextSnapshot;
        vm.mouseOverFn = mouseOverFn;
        vm.redrawChart = redrawChart;

        _.each(vm.warnings, function(warning) {
            var key = warning.key;
            if (key == "cpu" || key == "ram" || key == "fps") {
                function _handle(performance) {
                    return performance[key];
                }

                warning["avg"] = Math.round(_.sumBy(vm.subtaskDetail.performances, _handle) / vm.subtaskDetail.performances.length);

                warning["max"] = Math.round(_.maxBy(vm.subtaskDetail.performances, _handle)[key]);

                warning["min"] = Math.round(_.minBy(vm.subtaskDetail.performances, _handle)[key]);

                // 后台返回的byte
                if (key == "ram") {
                    warning["avg"] = Math.round(warning["avg"] / 1024);
                    warning["max"] = Math.round(warning["max"] / 1024);
                    warning["min"] = Math.round(warning["min"] / 1024);
                }
            }
        });

        function redrawChart() {
            $timeout(function() {
                _initHighchatOptions();
            }, 0)
        }

        function _initHighchatOptions() {
            // systemRamAvailable,没有systemRamAvailable则chart图上不显示systemRamAvailable选项
            vm.hasSystemRamAvailable = vm.subtaskDetail.performances[0].hasOwnProperty('systemRamAvailable');

            _setOptions();
        }

        function _setOptions() {
            vm.series = [];
            vm.yAxisArray = [];
            vm.images = vm.subtaskDetail.images;
            var yAxisIndex = 0;
            if (vm.warningObject.CPU) {
                vm.series.push({
                    key: 'cpu',
                    name: 'CPU占用率(%)',
                    type: 'line',
                    color: '#27a907',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "%"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#27a907'
                        }
                    },
                    title: {
                        enabled: false
                    }
                });
            }
            if (vm.warningObject.Memory) {
                vm.series.push({
                    key: 'ram',
                    name: '内存占用(kb)',
                    type: 'line',
                    color: '#0070f0',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "kb"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#0070f0'
                        },
                        format: '{value:.0f}'
                    },
                    title: {
                        enabled: false
                    }
                });
            }
            if (vm.hasSystemRamAvailable && vm.warningObject.AvailableMemory) {
                vm.series.push({
                    key: 'systemRamAvailable',
                    name: '可用内存占用(kb)',
                    type: 'line',
                    color: '#6dc3f9',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "kb"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#6dc3f9'
                        },
                        format: '{value:.0f}'
                    },
                    title: {
                        enabled: false
                    }
                });
            }
            if (vm.warningObject.Temperature) {
                vm.series.push({
                    key: 'temperature',
                    name: '温度(°C)',
                    type: 'line',
                    color: '#ff6c14',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "°C"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#ff6c14'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }
            if (vm.warningObject.DataTraffic) {
                vm.series.push({
                    key: 'totalFlow',
                    name: '流量(kb)',
                    type: 'line',
                    color: '#fa575f',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "kb"
                    },
                    time: '',
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#fa575f'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }

            if (vm.warningObject.Frame) {
                vm.series.push({
                    key: 'fps',
                    name: '帧速率(fps)',
                    type: 'line',
                    color: '#ffd200',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "fps"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#ffd200'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }

            if (vm.warningObject.gpuUsage && vm.gpuEnabled) {
                vm.series.push({
                    key: 'gpuUsage',
                    name: 'GPU(%)',
                    type: 'line',
                    color: '#8d66a6',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "%"
                    },
                    time: '',
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#8d66a6'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }
            if (vm.warningObject.batteryUsage && vm.batteryEnabled) {
                vm.series.push({
                    key: 'batteryUsage',
                    name: '电量(mAh)',
                    type: 'line',
                    color: '#013e85',
                    yAxis: yAxisIndex++,
                    tooltip: {
                        unit: "mAh"
                    },
                    time: '',
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    minRange: 1,
                    labels: {
                        style: {
                            color: '#013e85'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }

            _.each(vm.subtaskDetail.performances, function(performance, index) {

                // 格式如下:
                // {"sendFlow":0,"totalFlow":0,"temperature":37.3,"recFlow":0,"ram":44564.0,"scene":"Monkey测试","volumeId":0,"currentHeapSize":13311968,
                // "fps":17,"time":"2016-07-11 12:07:13","systemRamAvailable":1386426368,"ioWaitRatio":0.0,"cpu":23.776224,"networkStatus":true}

                _.each(vm.series, function(item, idx, list) {
                    var key = item['key'],
                        value = performance[key];
                    if (key == 'totalFlow' || key == 'systemRamAvailable') {
                        value = performance[key] / 1024;
                        value = value >= 1 ? Math.floor(value) : parseFloat(value.toFixed(2))
                    } else if (key == 'cpu') {
                        value = parseFloat((performance[key]).toFixed(2));
                    }

                    if (vm.batteryEnabled && key == 'batteryUsage') {
                        value = parseFloat((performance[key]).toFixed(2));
                    }
                    if (vm.gpuEnabled && key == 'gpuUsage') {
                        value = parseFloat((performance[key]).toFixed(2));
                    }

                    //填充每列数据
                    item.data.push([performance.millisecond, value]);
                });


                //获取抖动数据
                function _getDitterData(round, index, base) {
                    var mod = (index % round);
                    if (mod >= round / 2) {
                        mod = -1 * mod % (round / 2);
                    }
                    return base * mod / (round);
                }
            });

            //当数据全为0时重新刻画刻度让其居中
            _.each(vm.series, function(serie, index) {
                _.each(serie.data, function(item) {
                    //data:[[1465805403000, 0],[1465805420000, 0].....]item[0]为毫秒数item[1]为对应数据值
                    var valueIndex = 1;
                    if (item[valueIndex] != 0) {
                        return false;
                    }
                    //当能执行到最后一次循环（即该组数据值全为0）时重置y轴刻度
                    if (item == _.last(serie.data)) {
                        //当数据值全为0时重置y轴刻度，使0居中
                        vm.yAxisArray[index].tickPositions = [-2, -1, 0, 1, 2];
                    }
                })
            });

            if (vm.subtaskDetail.exception_image_url) {
                vm.exceptionPerformanceIndex = _.findIndex(vm.images, { "filePath": vm.subtaskDetail.exception_image_url });

                vm.currentNumber = vm.exceptionPerformanceIndex + 1;

                $timeout(function() {
                    _refreshPlotLine();
                }, 0)
            } else {
                vm.currentNumber = Math.min(vm.images.length, 1);
            }

            vm.showFancybox = function(currentIndex) {
                var images = [],
                    currentImages = vm.images.slice(vm.currentNumber - 1, vm.currentNumber + 3);
                angular.forEach(currentImages || [], function(image) {
                    images.push({
                        href: image.filePath,
                        title:  image.time,
                        helpers: {
                            title: {
                                type: 'inside'
                            }
                        }
                    });
                });

                $.fancybox(images, {
                    index: currentIndex,
                    //arrows: false,
                    loop: false
                });
            };
        }

        function mouseOverFn() {
            var xAxisIndex = this.index,
                currentPerformanceTime = vm.subtaskDetail.performances[xAxisIndex].time,
                currentIndex = Math.max(0, _.sortedIndexBy(vm.images, {
                    "time": currentPerformanceTime
                }, 'time'));

            currentIndex = Math.max(0, Math.min(currentIndex, vm.images.length - 1)); //sortedIndexBy返回值可能等于0和大于数组长度,防止数组越界

            if (hasPlotLine) {
                vm.chart.xAxis[0].removePlotLine('plot-line');
                hasPlotLine = false;
            }

            if (lastIndex != currentIndex) {
                $scope.$apply(function() {
                    vm.imagesLeftIn = currentIndex > lastIndex;
                    vm.currentNumber = currentIndex + 1;
                });
                lastIndex = currentIndex;
            }
        }

        _initHighchatOptions();

        function _refreshPlotLine() {
            var currentImage = vm.images[vm.currentNumber - 1];
            if (currentImage) {
                var time = currentImage.time,
                    performances = vm.subtaskDetail.performances;

                if (hasPlotLine) {
                    vm.chart.xAxis[0].removePlotLine('plot-line');
                }
                var index = _.sortedIndexBy(performances, {
                    "time": time
                }, 'time');

                index = Math.max(0, Math.min(index, performances.length - 1)); //sortedIndexBy返回值可能等于0和大于数组长度,防止数组越界

                vm.chart.xAxis[0].addPlotLine({
                    value: performances[index].time,
                    color: 'red',
                    width: 2,
                    id: 'plot-line'
                });

                hasPlotLine = true;
            }
        }

        function _getCurrentIndex() {
            return vm.currentNumber - 1;
        }

        function _updateCurrentNumber(currentIndex) {
            vm.currentNumber = currentIndex + 1;
            _refreshPlotLine();
        }

        function prevSnapshot() {
            var currentIndex = _getCurrentIndex();
            vm.imagesLeftIn = true;
            if (currentIndex > 0) {
                currentIndex = Math.max(currentIndex - moveImageCount, 0);
                _updateCurrentNumber(currentIndex);
            }
        }

        function nextSnapshot() {
            var currentIndex = _getCurrentIndex();
            vm.imagesLeftIn = false;
            if (currentIndex + moveImageCount < vm.images.length) {
                currentIndex = currentIndex + moveImageCount;
                _updateCurrentNumber(currentIndex);
            }
        }

        function _warningHandle(target) {
            // 只看当前性能指标数据
            _.map(vm.warningObject, function(value, key) {
                return vm.warningObject[key] = key == target;
            });

            // angular锚点定位
            $location.hash('performance');
            $anchorScroll();

            vm.redrawChart();
        }
    }

    function logsCtrl($scope, $stateParams, config, reportV2Service, DialogService, $timeout) {
        var vm = this,
            LOAD_PAGE_SIZE = 100;
        vm.subtaskDetail = $scope.vm.subtaskDetail;
        vm.currentFilterLevel = "all";
        vm.isOffline = config.isOffline;
        vm.appPids = "";
        vm.os = "";
        vm.levels = {
            "fatal": "F",
            "error": "E",
            "warn": "W",
            "info": "I",
            "debug": "D"
        };

        vm.scrollToLog = $stateParams.scrollToLog;

        vm.filter = {
            begin: 0,
            loadTotal: LOAD_PAGE_SIZE
        }

        vm.changeLevel = function(key) {
            if (vm.currentFilterLevel != key) {
                vm.currentFilterLevel = key;
                vm.refresh();
            }
        }

        vm.refresh = function() {
            vm.filter.begin = 0;
            vm.filter.loadTotal = LOAD_PAGE_SIZE;
            vm.showSearchControlled = false;
            vm.searchError = false;

            vm.filtedLogs = _.filter(vm.logs, function(log) {
                return ( vm.currentFilterLevel == "all" || log.level == vm.levels[vm.currentFilterLevel])
                    && (!vm.appPidChecked || vm.appPids.indexOf(log.pid) >= 0);
            })
        }

        if(vm.subtaskDetail.device_model.os.indexOf('ios')>-1){
            vm.os = "ios"
        }

        _initAppPids();

        function _initAppPids() {
            // "http://tbfiles-comptest.testbird.com/1472893244625_43a9e724_mini_5026_5027.log";
            if(vm.subtaskDetail.mini_log_url) {
                var url = vm.subtaskDetail.mini_log_url;
                // 取出上面url中的 "5026_5027"
                vm.appPids = url.substring(url.indexOf("mini_") + "mini_".length, url.length - ".log".length);
            }
        }


        reportV2Service.getMiniLogs(vm.subtaskDetail.all_log_url,vm.os).then(function(data) {
            vm.logs = data;
            $timeout(function () {$scope.$digest()},20)
            vm.refresh();
             if (vm.subtaskDetail.raw_exception_desc) {
                var rawExceptionDesc = _.trim(vm.subtaskDetail.raw_exception_desc);
                vm.exceptionLog = {
                    text: ''
                };

                //被rawExceptionDesc包含并且最长的为错误日志
                _.forEach(vm.logs, function(log) {
                    if (vm.exceptionLog.text.length < log.text.length && rawExceptionDesc.indexOf(log.text) > -1) {
                        vm.exceptionLog = log
                    }
                })

                if (!vm.exceptionLog.text) {
                    vm.exceptionLog = vm.logs[vm.logs.length - 1];
                }

                if ($stateParams.isGoToExceptionLogLine) {
                    _gotoExceptionLog()
                }

                $scope.$on('logs.loadingExceptionLog', function () {
                    _gotoExceptionLog()
                });

                function _gotoExceptionLog() {
                    vm.appPidChecked = false;
                    vm.refresh();
                    //错误日志显示在第三行
                    vm.filter.begin = _.max([vm.exceptionLog.index - 3, 0]);
                    //在指令中进行滚动
                    $scope.$broadcast('logs.directiveScrollToExceptionLog');
                }
            }
        });
    }
})();

(function() {
    angular.module('quail.report')
        .controller('ExecutionDetailCtrl', ExecutionDetailController)
        .controller('LogDetailCtrl', LogDetailController)
        .controller('ExecutionSnapshotsEditCtrl', ExecutionSnapshotsEditController)
        .controller('CompareSnapshotsCtrl', CompareSnapshotsController)
        .controller('PlayVideoCtrl', PlayVideoCtrl);

    function ExecutionDetailController($location, $timeout, $anchorScroll, $scope, ModalService, TestCaseService, DialogService, executionDetail, ExecutionDetailService, ReportService, $state, $stateParams, TASK_ENUM, TESTCASE_ENUM, REPLAY_MODE, sysConfig, FileService) {
        var vm = this,
            hasPlotLine = false,
            lastIndex = 0,
            moveImageCount = 1, // 点击前进或后退按钮替换的图片张数
            allImages = [];


        _activate();

        function _activate() {
            $(window).scrollTop(0);
            vm.slider = {};
            vm.sliderOptions = {
                navArrow: false,
                lazyLoad: true
            };
            vm.isLab = config.isLab();
            vm.isOffline = config.isOffline;
            vm.threshold_ram = sysConfig['threshold.ram'];
            vm.threshold_fps = sysConfig['threshold.fps'];
            vm.threshold_cpu = sysConfig['threshold.cpu'];
            vm.executionDetail = executionDetail;
            vm.canChangeCompare = $stateParams.canChangeCompare == "true";
            vm.isReplayTask = vm.executionDetail.task_type == TASK_ENUM.taskType.replay;
            vm.isComptestReplayTask = executionDetail.task_replay_mode == REPLAY_MODE.comptest || executionDetail.task_replay_mode == REPLAY_MODE.monkey;
            vm.shouldShowCompares = vm.isReplayTask && !vm.isComptestReplayTask;
            vm.priorityDef = TESTCASE_ENUM.priority;
            vm.showDetailDesc = false;
            vm.isIos = executionDetail.app.type == 'ios';
            if (vm.isIos) {
                vm.iosNum = ExecutionDetailService.getIosNum(executionDetail.device.os);
            }

            vm.downloadLog = downloadLog;
            vm.downloadByUrl = downloadByUrl;
            vm.downloadXml = FileService.downloadText;
            vm.playVideo = playVideo;
            vm.isShowVideo = isShowVideo;
            vm.isShowLayoutBtn = isShowLayoutBtn;
            vm.currentXml = 'xml';

            if (vm.executionDetail.performances.length && vm.executionDetail.performances[0].performance.hasOwnProperty("gpuUsage")) {
                vm.gpuEnabled = true;
                //性能曲线显示电量
                vm.batteryEnabled = true;
            }
            _initExecutionParams();

            //回放用例，图片无法编辑，非回放用例，则根据canChangeCompare来确定是否可编辑
            vm.executionDetail.snapshotsEditable = vm.isReplayTask ? false : vm.canChangeCompare;

            if (vm.shouldShowCompares) {

                //默认显示base与current图片
                vm.showDiff = false;

                vm.setCurrentSnapshot = function(snapshot) {
                    !snapshot.valid_baseline && ($scope.snapshot = snapshot);
                }

                $scope.updateSnapshot = function(model) {
                    TestCaseService.updateSnapshot(vm.executionDetail.testcase.id, _.extend({}, $scope.snapshot, model))
                        .then(function() {
                            _.extend($scope.snapshot, model);
                        });
                }

                vm.showCurrentReplayLayout = function(e) {
                    e.stopPropagation();
                    var layoutUrl = vm.executionDetail.compares[_getCurrentIndex()].layoutUrl, index = layoutUrl.lastIndexOf("\/");;
                    vm.currentXml = layoutUrl.slice(index+1,layoutUrl.length-4)
                    TestCaseService.getXmlLayout(vm.executionDetail.compares[_getCurrentIndex()].layoutUrl).then(_replaySnapshotLayout);

                    function _replaySnapshotLayout(xml) {
                        vm.xml = xml;
                        vm.layoutImg = vm.images[_getCurrentIndex()];
                        ModalService.show({
                            templateUrl: 'apps/report/execution-detail/templates/replay.snapshot.layout.html',
                            size: 'hg',
                            scope: $scope
                        })
                    }
                }

                vm.isShowUpdateBtn = function(isUpdateAll) {
                    return isUpdateAll ? !_.isEmpty(_.filter(vm.executionDetail.compares, function(compare) {
                        return compare.click_mode == 1;// click==1表示layout需要更新
                    })) : (vm.executionDetail.compares[_getCurrentIndex()].click_mode == 1)
                };

                vm.updateLayout = function(isUpdateAll) {
                    var params = isUpdateAll ? _.map(_.filter(vm.executionDetail.compares, function(compare) {
                        return compare.click_mode == 1;// click==1表示layout需要更新
                    }), function(compare) {
                        return {actionId: compare.base.key.split("_o.jpg")[0], layoutUrl: compare.layoutUrl}
                    }) :
                        [{
                            actionId: vm.executionDetail.compares[_getCurrentIndex()].base.key.split("_o.jpg")[0],
                            layoutUrl: vm.executionDetail.compares[_getCurrentIndex()].layoutUrl
                        }];
                    ExecutionDetailService.updateLayout(executionDetail.id, params).then(function() {
                        DialogService.alert("更新layout成功!")
                    })
                };

                $scope.$on('node.afterClick', function(e, node) {
                    e.stopPropagation();
                    return _xmlClick(node);
                });

                function _xmlClick(node) {
                    vm.layoutProps = [];
                    _.each(node, function(value, key) {
                        if (_.startsWith(key, "_")) {
                            var obj = Object();
                            obj[key.substring(1)] = value;
                            vm.layoutProps.push(obj);
                        }
                    });
                    vm.layoutProps.sort(function(obj1, obj2) {
                        var key1 = _.keys(obj1)[0],
                            key2 = _.keys(obj2)[0];

                        if (key1 < key2) {
                            return -1;
                        } else if (key1 > key2) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                }

                vm.images = allImages;
                vm.filter = {
                    fail: true,
                    optimizable: true,
                    pass: true
                };
                _refreshReplayCompares();

                $scope.$watch("vm.filter", function(newVal, oldVal) {
                    vm.images = _.filter(allImages, function(image) {
                        if (vm.filter[image.state]) {
                            return image;
                        }
                    });
                }, true);


                $scope.$watch("vm.images", function() {

                    vm.currentNumber = _.min([vm.currentNumber, vm.images.length]);
                    //当所有状态未选择时vm.currentNumber为0，若再次选择一种或多种状态时vm.currentNumber指向第一张图片
                    if (vm.images.length && !vm.currentNumber) {
                        vm.currentNumber = 1;
                    }
                })
            } else {
                if (vm.isComptestReplayTask) {
                    //如果是兼容性回放任务，过滤掉原图
                    executionDetail.snapshots = _.filter(executionDetail.snapshots, function(item) {
                        return !_.endsWith(item.url, "_o.jpg");
                    });
                }
                vm.images = executionDetail.snapshots || [];
            }

            // 性能隐患
            vm.warningsCount = {
                'cpu': 0,
                'ram': 0,
                'fps': 0
            };

            vm.shareLink = window.location.protocol + "//" + window.location.host + "/execution/" + executionDetail.hashkey + "/";

            _.each(vm.executionDetail.issue_types, function(item) {
                vm.warningsCount[item] = 1;
            });

            vm.issuesObject = {
                CPU: true,
                Memory: true,
                AvailableMemory: true,
                Frame: true,
                Temperature: true,
                DataTraffic: true,
                gpuUsage: true,
                batteryUsage: true,
                cacheSize: true,
                devTime: true
            };

            vm.redrawChart = function() {
                setTimeout(function() {
                    initHighChatOptions();
                }, 0)
            };


            vm.series = [];
            vm.yAxisArray = [];

            initHighChatOptions();

            vm.currentNumber = Math.min(vm.images.length, 1);
            $scope.$watch('vm.currentNumber', function() {
                if (vm.slider.slideTo) {
                    vm.slider.slideTo(vm.currentNumber - 1);
                }
            });

            // mini_log_url存在则显示mini日志,否则显示原始日志
            if (vm.executionDetail.run_log_url) {
                _initMiniLogs();
            } else {
                _initOriginLogs();
            }
        }

        // function _getThresholdValue(key) {
        //     var result = [];
        //     _.forEach(sysConfig[key].split(','), function (val) {
        //         result.push(Number(val));
        //     });
        //     return result;
        // }

        function _initExecutionParams() {

            vm.isParametric = (executionDetail.task_replay_mode == REPLAY_MODE.oldInitValue || executionDetail.task_replay_mode == REPLAY_MODE.comptest) ? executionDetail.is_expanded : (executionDetail.task_replay_mode == REPLAY_MODE.text);
            vm.inputParams = _.filter(vm.executionDetail.text_results, { type: 'input' });
            vm.outputParams = _.filter(vm.executionDetail.text_results, { type: 'output' });
            // 页面响应时间
            vm.measureResponses = _.chain(vm.executionDetail.compares).filter(function(compare){
                return compare.measure_name;
            }).map(function(compare) {
                return {measureName: compare.measure_name, responseTime: compare.response_time};
            }).value();

            vm.isShowCheckImg = true;

            var paramsMap = {};

            angular.forEach(vm.executionDetail.text_results, function(item) {
                paramsMap[item.name] = item.actual;
            });
            vm.formulas = vm.executionDetail.formulas;
            vm.formula_scripts = vm.executionDetail.formula_scripts;
            vm.goCompareSnapshot = goCompareSnapshot;
            vm.showOutputImage = showOutputImage;

            function showOutputImage(index) {
                $.fancybox(_.map(vm.outputParams, function(output) {
                    return {
                        href: vm.isShowCheckImg ? output.current_url.replace(TESTCASE_ENUM.fileSuffix.originalImg, TESTCASE_ENUM.fileSuffix.checkedImg) : output.current_url,
                        helpers: {
                            title: {
                                type: 'inside'
                            }
                        }
                    };
                }), {
                    index: index,
                    loop: false
                });
            }

            function goCompareSnapshot(index) {
                vm.refreshCompareImage(_.findIndex(vm.images, {key: _getKeyByUrl(vm.outputParams[index].current_url)}));
                $location.hash("snapshot-compare-container");
                $anchorScroll();
            }

            function _getKeyByUrl(url) {
                return url.split('/').pop();
            }
        }

        vm.showSnapshots = function() {
            executionDetail.editable = vm.canChangeCompare;
            ModalService.show({
                templateUrl: 'apps/report/execution-detail/templates/execution.snapshots.html',
                controller: 'ExecutionSnapshotsEditCtrl',
                controllerAs: 'vm',
                size: 'hg',
                resolve: {
                    execution: function() {
                        return executionDetail;
                    }
                }
            }).finally(function() {
                if (executionDetail.editable) {
                    // 查看截图reload之后页面会滚动到底部,手动滚动回截图处
                    $state.reload().then(function(){
                        $timeout(function() {
                            $location.hash("images");
                            $anchorScroll();
                        }, 200);
                    });
                }
            });
        };

        // 显示参数回放全部截图
        vm.showCompareSnapshots = function() {
            ModalService.show({
                templateUrl: 'apps/report/execution-detail/templates/execution.compares.html',
                windowClass: 'compares-snapshots-dialog',
                controller: 'CompareSnapshotsCtrl',
                controllerAs: 'vm',
                resolve: {
                    images: function() {
                        return vm.images;
                    }
                },
                size: 'hg'
            })
        };

        $scope.refreshExecutionResult = function() {
            var model = {
                name: vm.executionDetail.name,
                result: vm.executionDetail.result_code,
                severity: vm.executionDetail.severity_code || vm.executionDetail.severity_code == 0 ?  vm.executionDetail.severity_code : TASK_ENUM.executionSeverity.normal, //保证失败时严重程度有个初始值
                desc: vm.executionDetail.desc,
                updateBaseline: false,
                isReplayTask: vm.isReplayTask,
                isParametric: vm.isParametric
            }

            if (vm.isComptestReplayTask) {
                return;
            }

            ModalService.show({
                templateUrl: 'apps/report/execution-detail/templates/refresh.execution.result.html',
                model: model
            }).then(function(model) {
                if (model.result != TASK_ENUM.executionResult.failed) {
                    model.severity = null;
                }
                if (model.result != TASK_ENUM.executionResult.passed) {
                    model.updateBaseline = false;
                }
                if (model.over) {
                    ReportService.refreshExecutionResult(vm.executionDetail.hashkey, model).then(function() {
                        $state.reload();
                    });
                }
            })
        };

        vm.changeCompare = function(updateBaseline, snapshot) {
            if (!snapshot.valid_baseline && updateBaseline) {
                DialogService.alert("测试案例基准图片已经不存在，不能修改！");
                return;
            }
            var prompt = updateBaseline ? '是否用本次截图更新参考截图？' : '是否忽略对比结果';
            ModalService.show({
                templateUrl: 'apps/report/execution-detail/templates/confirm.modal.html',
                model: {
                    prompt: prompt
                },
                size: 'sm'
            }).then(function(model) {
                if (model.close) {
                    var imagesCurrentIndex = vm.currentNumber - 1;
                    if ((vm.images[imagesCurrentIndex].state == "pass") || (!updateBaseline && vm.images[imagesCurrentIndex].state == "optimizable")) {
                        return
                    }
                    var data = {
                        executionId: executionDetail.id,
                        snapshotKey: vm.images[imagesCurrentIndex].base.key,
                        updateBaseline: updateBaseline
                    };
                    ExecutionDetailService.updateCompare(data).then(function() {
                        var compare = _.find(executionDetail.compares, function(item) {
                            return item.base.key == data.snapshotKey;
                        });
                        compare.diff.key = "";
                        if (updateBaseline) {
                            compare.diff.url = "";
                            compare.base.url = compare.current.url;
                        }
                        _refreshReplayCompares();
                    })
                }
            })
        };

        vm.hitMeasureResponseTime = function(time) {
            if (+time == 0) return "<100";
            if (+time == -1) return ">4000";
            return time;
        };

        vm.hitParam = function(param) {
            if (param.regExp == TESTCASE_ENUM.regular.matchAll && param.expect == "*") {
                return "*(匹配任一值)";
            }
            return param.expect;
        };

        function _refreshReplayCompares() {
            allImages = [];
            _.each(executionDetail.compares, function(value, key) {
                if (value.diff.key && value.diff.url) {
                    value.current.state = 'fail';
                } else if (!value.diff.key && value.diff.url) {
                    value.current.state = 'optimizable';
                } else {
                    value.current.state = 'pass';
                }
                value.current.diff = value.diff;
                value.current.base = value.base;
                allImages.push(value.current);
            });
            vm.images = _.filter(allImages, function(image) {
                if (vm.filter[image.state]) {
                    return image;
                }
            });
            vm.failImages = _.filter(allImages, function(image) {
                if (image.state == "fail") {
                    return image;
                }
            });
        }

        function initHighChatOptions() {

            var performances = vm.executionDetail.performances;
            vm.hasSystemRamAvailable = performances.length > 0 && performances[0].performance.hasOwnProperty('systemRamAvailable');
            //计算平均值
            vm.cupAverage = _setAverage('cpu').toFixed(2);

            vm.memoryAverage = _setAverage('ram') / 1024;
            vm.memoryAverage = vm.memoryAverage >= 1 ? Math.floor(vm.memoryAverage) : parseFloat(vm.memoryAverage.toFixed(2));

            if (vm.hasSystemRamAvailable) {
                 vm.availableMemoryAverage = _setAverage('systemRamAvailable') / 1024;
                 vm.availableMemoryAverage = vm.availableMemoryAverage >= 1 ? Math.floor(vm.availableMemoryAverage) : parseFloat(vm.availableMemoryAverage.toFixed(2));
            }
            vm.temperatureAverage = _setAverage('temperature').toFixed(2);

            vm.dataTrafficAverage = _setAverage('totalFlow') / 1024;
            vm.dataTrafficAverage = vm.dataTrafficAverage >= 1 ? Math.floor(vm.dataTrafficAverage) : parseFloat(vm.dataTrafficAverage.toFixed(2));
            vm.cacheSizeAverage = _setAverage('cacheSize') / 1024 ;
            vm.cacheSizeAverage = vm.cacheSizeAverage >= 1 ? Math.floor(vm.cacheSizeAverage) : parseFloat(vm.cacheSizeAverage.toFixed(2));


            vm.frameAverage = _setAverage('fps').toFixed(2);

            if (vm.gpuEnabled) vm.gpuUsageAverage = _setAverage('gpuUsage').toFixed(2);

            if (vm.batteryEnabled) vm.batteryUsageAverage = _setAverage('batteryUsage').toFixed(2);

            _setOptions();
        }

        function _setAverage(key) {
            var sum = 0;
            _.each(vm.executionDetail.performances, function(performance_object) {
                sum += performance_object.performance[key]  ? performance_object.performance[key] : 0;
            });
            return (sum/vm.executionDetail.performances.length);
        }

        function _setOptions() {
            vm.series = [];
            vm.yAxisArray = [];
            var i = 0;
            if (vm.issuesObject.CPU) {
                vm.series.push({
                    key: "cpu",
                    name: 'CPU 占用率(%)',
                    type: 'line',
                    color: '#27a907',
                    yAxis: i++,
                    tooltip: {
                        unit: "%"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
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
            if (vm.issuesObject.Memory) {
                vm.series.push({
                    key: 'ram',
                    name: '内存占用(kb)',
                    type: 'line',
                    color: '#0070f0',
                    yAxis: i++,
                    tooltip: {
                        unit: "kb"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
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
            if (vm.hasSystemRamAvailable && vm.issuesObject.AvailableMemory) {
                vm.series.push({
                    key: 'systemRamAvailable',
                    name: '可用内存(kb)',
                    type: 'line',
                    color: '#6dc3f9',
                    yAxis: i++,
                    tooltip: {
                        unit: "kb"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
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
            if (vm.issuesObject.Temperature) {
                vm.series.push({
                    key: 'temperature',
                    name: '温度(°C)',
                    type: 'line',
                    color: '#ff6c14',
                    yAxis: i++,
                    tooltip: {
                        unit: "°C"
                    },
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
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
            if (vm.issuesObject.DataTraffic) {
                vm.series.push({
                    key: 'totalFlow',
                    name: '流量(kb)',
                    type: 'line',
                    color: '#ae5da1',
                    yAxis: i++,
                    tooltip: {
                        unit: "kb"
                    },
                    time: '',
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    labels: {
                        style: {
                            color: '#ae5da1'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }
            if (vm.issuesObject.Frame) {
                vm.series.push({
                    key: 'fps',
                    name: '帧速率(fps)',
                    type: 'line',
                    color: '#ffd200',
                    yAxis: i++,
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
            if (vm.issuesObject.gpuUsage && vm.gpuEnabled) {
                vm.series.push({
                    key: 'gpuUsage',
                    name: 'GPU(%)',
                    type: 'line',
                    color: '#8d66a6',
                    yAxis: i++,
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
            if (vm.issuesObject.batteryUsage && vm.batteryEnabled) {
                vm.series.push({
                    key: 'batteryUsage',
                    name: '电量(mAh)',
                    type: 'line',
                    color: '#013e85',
                    yAxis: i++,
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
            if (vm.issuesObject.cacheSize && !vm.isIos) {
                vm.series.push({
                    key: 'cacheSize',
                    name: '应用缓存(kb)',
                    type: 'line',
                    color: '#aa3332',
                    yAxis: i++,
                    tooltip: {
                        unit: "kb"
                    },
                    time: '',
                    data: []
                });
                vm.yAxisArray.push({
                    gridLineWidth: 0,
                    labels: {
                        style: {
                            color: '#aa3332'
                        }
                    },
                    title: {
                        enabled: false
                    },
                    opposite: true
                });
            }

            _.each(vm.executionDetail.performances, function(performance_object) {
                var performance = performance_object.performance;
                _.each(vm.series, function(item) {

                    var key = item['key'] ,
                        value = performance[key] ;
                    if (key == 'totalFlow' || key == 'systemRamAvailable' || key == 'ram') {
                        value = performance[key] / 1024;
                        value = value >= 1 ? Math.floor(value) : parseFloat(value.toFixed(2));
                    } else if (key == 'cacheSize') {
                        value = performance[key] ? performance[key] / 1024 : 0;
                        value = value >= 1 ? Math.floor(value) : parseFloat(value.toFixed(2));
                    }
                    else if (key == 'currentHeapSize') {
                        value = performance[key] / 1024 / 1024;
                        value = value >= 1 ? Math.floor(value) : parseFloat(value.toFixed(2));
                    }
                    else if (key == 'cpu') {
                        value = parseFloat((performance[key]).toFixed(2));
                    }
                    if (vm.batteryEnabled && key == 'batteryUsage') {
                        value = parseFloat((performance[key]).toFixed(2));
                    }
                    if (vm.gpuEnabled && key == 'gpuUsage') {
                         value = parseFloat((performance[key]).toFixed(2));
                    }
                    //填充每列数据 timestamp->time
                    item.data.push([performance.time, value]);
                });

            });

            if (angular.isFunction(vm.drawChart)) { // vm.drawChart方法在directive中定义
                vm.drawChart();
            }

            vm.showFancybox = function(index) {
                var fancyImages, startIndex, endIndex, currentImages, LIMITE = 3;
                startIndex = Math.max(vm.currentNumber - 1, 0);
                startIndex = vm.images.length < LIMITE ? startIndex : Math.min(startIndex, vm.images.length - LIMITE);
                endIndex = startIndex + LIMITE;
                currentImages = vm.images.slice(startIndex, endIndex);
                if (index !== undefined) {
                    index = index - startIndex;
                    fancyImages = _.map(currentImages || [], function(image) {
                        return {
                            href: image.url,
                            title: image.time,
                            helpers: {
                                title: {
                                    type: 'inside'
                                }
                            }
                        }
                    });
                }

                $.fancybox(fancyImages, {
                    index: index,
                    loop: false
                });
            }
        }

        function _refreshPlotLine() {
            var currentImage = vm.images[vm.currentNumber - 1];
            if (currentImage && vm.executionDetail.performances.length) {
                var time = currentImage.time;
                if (hasPlotLine) {
                    vm.chart.xAxis[0].removePlotLine('plot-line');
                }
                var index = _.sortedIndexBy(vm.executionDetail.performances, {
                    "performance": {
                        "time": time
                    }
                }, 'performance.time') - 1;
                index = Math.max(0, Math.min(index, vm.executionDetail.performances.length - 1)); //sortedIndexBy返回值可能会大于数组长度

                vm.chart.xAxis[0].addPlotLine({
                    value: vm.executionDetail.performances[index].performance.time,
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

        vm.mouseOverFn = function() {
            var xAxisIndex = this.index,
                currentPerformanceTime = vm.executionDetail.performances[xAxisIndex].performance.time,
                currentIndex = Math.max(0, _.sortedIndexBy(vm.images, {
                    "time": currentPerformanceTime
                }, 'time') - 1);

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
        };

        // 操作截图
        vm.preSnapshot = function() {
            var currentIndex = _getCurrentIndex();
            vm.imagesLeftIn = true;
            if (currentIndex > 0) {
                currentIndex = Math.max(currentIndex - moveImageCount, 0);
                _updateCurrentNumber(currentIndex);
            }
        };
        vm.nextSnapshot = function() {
            var currentIndex = _getCurrentIndex();
            vm.imagesLeftIn = false;
            if (currentIndex + moveImageCount < vm.images.length) {
                currentIndex = currentIndex + moveImageCount;
                _updateCurrentNumber(currentIndex);
            }
        };

        vm.refreshPatchedSnapshot = function(direction) {
            var patchedImages = [];

            _.each(vm.images, function(item, index) {
                if (item.is_patched) {
                    patchedImages.push({ "index": index, "item": item })
                }
            })
            var currentIndex = _getCurrentIndex();

            //direction为1表示下一张标记，为-1表示上一张标记
            if (direction == 1) {
                currentIndex += direction;
            }
            var pos = _.sortedIndexBy(patchedImages, { "index": currentIndex }, "index");
            if (direction == -1) {
                pos += direction;
            }

            if (pos < patchedImages.length && pos >= 0) {
                _updateCurrentNumber(patchedImages[pos].index);
            }
        };

        vm.refreshCompareImage = function(index) {
            if (index >= 0 && index <= vm.images.length - 1) {
                _updateCurrentNumber(index);
            }
        };

        function downloadLog() {
            window.open(vm.executionDetail.run_log_url);
        }

        function downloadByUrl(url) {
            window.open(url);
        }

        function playVideo(videoPath) {
            ModalService.show({
                templateUrl: 'apps/report/execution-detail/templates/play.video.modal.html',
                controller: 'PlayVideoCtrl',
                controllerAs: 'vm',
                size: 'lg',
                resolve: {
                    videoPath: function(){
                        return videoPath;
                    }
                }
            });
        }

        function isShowVideo() {
            if (vm.isIos) {
                return vm.executionDetail.video_path && vm.iosNum >= 11;
            } else {
                return vm.executionDetail.video_path;
            }
        }

        // 回放key去回放脚本中找对应的脚本行为,部分动作没有layout,有layout的步骤才显示"查看回放layout"按钮
        function isShowLayoutBtn(compare) {
            var suffix = _.includes(compare.current.key, "_o.jpg") ? "_o.jpg" : "_.jpg",
                key = compare.current.key.split(suffix)[0],
                action = _.find(vm.executionDetail.testcase.script_json, {actionId: key});

            return _.includes(TESTCASE_ENUM.mainControlActions, action.action);
        }

        function _initOriginLogs() {

            vm.logException = [];

            vm.exceptionCount = {
                Error: {
                    key: 'Error',
                    name: "错误",
                    count: 0
                },
                NativeCrash: {
                    key: 'NativeCrash',
                    name: "本地崩溃",
                    count: 0
                },
                Fatal: {
                    key: 'Fatal',
                    name: "致命错误",
                    count: 0
                },
                ANR: {
                    key: 'ANR',
                    name: "ANR",
                    count: 0
                },
                Exception: {
                    key: 'Exception',
                    name: "异常",
                    count: 0
                },
                Failure: {
                    key: 'Failure',
                    name: "失败",
                    count: 0
                }
            };

            // 日志
            $.ajax({
                dataType: "json",
                type: "GET",
                async: false,
                url: vm.executionDetail.run_log_index_url,
                success: function(data) {
                    vm.logException = data;
                    _initExceptionCount();
                }
            });

            //初始化各项异常数量
            function _initExceptionCount() {
                vm.logFileSize = 0;
                if (vm.logException) {
                    _.each(vm.logException, function(item) {
                        var exception = vm.exceptionCount[item.content.subType];
                        exception && exception.count++;
                    });
                    // the index file format like below
                    //   [{"index":{"endByte":27428,"line":273,"startByte":27328},"content":{"time":1463563804859,"type":"LogException","level":"Middle","info":" java.lang.IllegalStateException: manually crash for demo","pid":15512,"title":"java.lang.IllegalStateException","subType":"Exception"}}]
                    // find the max  endByte as the file size
                    var maxEndByte = _.chain(vm.logException)
                        .map('index')
                        .map('endByte')
                        .max()
                        .value();
                    var maxStartByte = _.chain(vm.logException)
                        .map('index')
                        .map('startByte')
                        .max()
                        .value();
                    if (maxEndByte == maxStartByte) {
                        // end == start indicate this is the file end. have no need to add extra bytes.
                        vm.logFileSize = maxEndByte;
                    } else {
                        //XXX: we don't know the end of log file size. so try to guess it with 16 bytes.
                        vm.logFileSize = maxEndByte + 16;
                    }
                }
            }

            // 日志默认显示类型
            vm.subTypeKey = "Error";

            vm.showLogDetail = function(exception) {
                ModalService.show({
                    templateUrl: "apps/report/execution-detail/templates/log.modal.html",
                    windowClass: "log-dialog",
                    controller: "LogDetailCtrl",
                    controllerAs: 'vm',
                    resolve: {
                        exception: function() {
                            exception.logFileSize = vm.logFileSize;
                            return exception;
                        },
                        executionDetail: function() {
                            return vm.executionDetail;
                        }
                    }
                })
            }
        }

        function _initMiniLogs() {
            var LOAD_PAGE_SIZE = 100;
            vm.currentFilterLevel = "all";
            vm.appPids = "";
            vm.levels = {
                "fatal": "F",
                "error": "E",
                "warn": "W",
                "info": "I",
                "debug": "D"
            };
            vm.os = "";
            if(vm.executionDetail.device.os.indexOf('ios')>-1){
                vm.os = "ios"
            }
            vm.logFilter = {
                begin: 0,
                loadTotal: LOAD_PAGE_SIZE
            };

            vm.changeLevel = function(key) {
                if (vm.currentFilterLevel != key) {
                    vm.currentFilterLevel = key;
                    vm.refresh();
                }
            };

            vm.refresh = function() {
                vm.logFilter.begin = 0;
                vm.logFilter.loadTotal = LOAD_PAGE_SIZE;
                vm.showSearchControlled = false;
                vm.searchError = false;

                vm.filtedLogs = _.filter(vm.logs, function(log) {
                    return (vm.currentFilterLevel == "all" || log.level == vm.levels[vm.currentFilterLevel]) && (!vm.appPidChecked || vm.appPids.indexOf(log.pid) >= 0);
                })
            };

            _initAppPids();

            function _initAppPids() {
                // "http://tbfiles-comptest.testbird.com/1472893244625_43a9e724_mini_5026_5027.log";
                if(vm.executionDetail.mini_log_url){
                    var url = vm.executionDetail.mini_log_url;
                    // 取出上面url中的 "5026_5027"
                    vm.appPids = url.substring(url.indexOf("mini_") + "mini_".length, url.length - ".log".length);
                }
            }
        }
    }

    function LogDetailController($scope, $http, exception, executionDetail, $uibModalInstance, ExecutionDetailService) {
        var vm = this;
        vm.exception = exception;

        vm.cancel = function() {
            $uibModalInstance.close();
        };

        var thisBytes = {},
            this_loadByte = 1024,
            currentLogIndex = -1;

        vm.setLogIndex = function() {
            thisBytes = {
                startByte: exception.index.startByte,
                endByte: exception.index.endByte,
                originStartByte: exception.index.startByte,
                originEndByte: exception.index.endByte,
                fileSize: exception.logFileSize
            };
        };

        vm.showLogs = function(type) {
            //0 向上查询，1 向下查询
            if (type == 0) {
                thisBytes.endByte = thisBytes.originStartByte;
                thisBytes.startByte = _.max([thisBytes.endByte - this_loadByte, 0]);
                thisBytes.originStartByte = thisBytes.startByte;
                getLogsData(thisBytes.startByte, thisBytes.endByte, type);
            } else if (type == 1) {
                thisBytes.startByte = thisBytes.originEndByte;
                thisBytes.endByte = _.min([thisBytes.startByte + this_loadByte, thisBytes.fileSize]);
                thisBytes.originEndByte = thisBytes.endByte;
                getLogsData(thisBytes.startByte, thisBytes.endByte, type);
            }
        };

        function getLogsData(startByte, endByte, type) {

            var runLogUrl = executionDetail.run_log_url.split("?")[0],
                $logContentContainer = $('#id_logs_scroll');
            if (startByte == endByte) {
                if (type == 0) {
                    $logContentContainer.scrollTop(0);
                } else if (type == 1) {
                    $logContentContainer.scrollTop($logContentContainer[0].scrollHeight);
                }
            } else {
                ExecutionDetailService.getExecutionLog(runLogUrl, startByte, endByte).then(function(data) {
                    var $logContentContainer = $('#id_logs_scroll');
                    //type 0 向上插入，1 向下插入
                    if (type == 0) {
                        if ("" == data) {
                            //结束销毁按钮
                            $('#prev-button').hide();
                        } else {
                            $logContentContainer.prepend("<pre>" + data + "</pre>");
                            $logContentContainer.scrollTop(0);
                        }
                    } else if (type == 1) {
                        if ("" == data) {
                            //结束销毁按钮
                            $('#next-button').hide();
                        } else {
                            $logContentContainer.append("<pre>" + data + "</pre>");
                            $logContentContainer.scrollTop($logContentContainer[0].scrollHeight);
                        }
                    }
                });
            }
        }
    }

    function ExecutionSnapshotsEditController($scope, $uibModalInstance, $q, DialogService, ExecutionDetailService, execution) {
        var vm = this;

        vm.execution = execution;
        vm.snapshots = [];
        $scope.execution = execution;

        angular.forEach($scope.execution.snapshots, function(snapshot) {
            snapshot = angular.copy(snapshot);
            if (snapshot.is_patched) {
                snapshot.patch = {
                    key: snapshot.url.substr(snapshot.url.lastIndexOf("/") + 1),
                    url: snapshot.url
                }
            }
            vm.snapshots.push(snapshot);
        });

        vm.setCurrentSnapshot = function(snapshot) {
            $scope.snapshot = snapshot;
        }

        vm.showSnapshot = function(index) {
            $.fancybox(_.map(vm.snapshots, function(snapshot) {
                return {
                    href: snapshot.patch ? snapshot.patch.url : snapshot.url,
                    helpers: {
                        title: {
                            type: 'inside'
                        }
                    }
                };
            }), {
                index: index,
                loop: false
            });
        }

        vm.deleteSnapshot = function(snapshot) {
            //如果当前图片为标记图片，则需要删除标记图与原图
            DialogService.confirm("是否确认删除截图?").then(function () {
                return $q.when(snapshot.patch ? vm.deleteSnapshotPatch(snapshot) : '');
            }).then(function () {
                return ExecutionDetailService.deleteSnapshot(execution, snapshot.key);
            }).then(function () {
                _.remove(vm.snapshots, function (item) {
                    return item.key == snapshot.key;
                });
            });
        }

        vm.deleteSnapshotPatch = function(snapshot) {
            ExecutionDetailService.deleteSnapshotPatch(execution, snapshot).then(function() {
                delete snapshot.patch
                snapshot.is_patched = false;
                snapshot.url = _getOriginUrl(snapshot.url);
            });
        }

        vm.getSnapshotUrl = function(snapshot) {
            return snapshot.patch ? snapshot.patch.url : snapshot.url;
        }

        vm.getOriginUrl = function(snapshot) {
            return snapshot.patch ? _getOriginUrl(snapshot.url) : snapshot.url;
        }

        vm.close = function() {
            $uibModalInstance.close();
        }

        vm.cancel = function() {
            $uibModalInstance.dismiss();
        }

        function _getOriginUrl(url) {
            return url.replace(/_\d+\./, '.');
        }
    }

    function CompareSnapshotsController($scope, $uibModalInstance, images) {
        var vm = this;

        vm.images = images;
        vm.compareSnapshots = [];
        vm.isShowBase = false;

        vm.close = close;
        vm.showCompareSnapshot = showCompareSnapshot;
        vm.toggleShowBase = toggleShowBase;


        _initCompareSnapshots();

        function _initCompareSnapshots() {
            vm.compareSnapshots = _.map(vm.images, function(image) {
                return {
                    currentGesture: image.url,
                    baseGesture: image.base.url
                };
            });
        }

        function toggleShowBase() {
            vm.isShowBase = !vm.isShowBase;
        }

        // 显示单个参数回放截图
        function showCompareSnapshot(currentIndex) {

            var snapshots = [];
            _.each(vm.compareSnapshots, function(snapshot) {
                snapshots.push(snapshot.currentGesture);
                if (vm.isShowBase) {
                    snapshots.push(snapshot.baseGesture);
                }
            });

            // isShowBase:true时,vm.compareSnapshots一个元素会在snapshots中生成2个元素,它们对应图片之间index存在2n和2n+1的关系
            if (!vm.isShowBase) {
                currentIndex = currentIndex / 2;
            }

            $.fancybox(_.map(snapshots, function(url, index) {
                return {
                    href: url,
                    title: (index + 1) + "/" + snapshots.length + "张",
                    helpers: {
                        title: {
                            type: 'outside'
                        }
                    }
                };
            }), {
                index: currentIndex,
                loop: false
            });
        }

        function close() {
            $uibModalInstance.dismiss();
        }
    }

    function PlayVideoCtrl($rootScope, $scope, $sce, $uibModalInstance, videoPath) {
        var vm = this;

        vm.videoPath = $sce.trustAsResourceUrl(videoPath);

        vm.cancel = cancel;
        vm.close = close;

        function cancel() {
            $uibModalInstance.dismiss();
        }

        function close() {
            $uibModalInstance.close();
        }
    }
})();


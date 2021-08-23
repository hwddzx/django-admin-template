(function() {
    angular.module('report_v2')
        .controller('reportCtrlV2', reportCtrl);

    function reportCtrl($rootScope, $scope, $translate, $state, $stateParams, $location, compatibility,
                        overview, performance, config, reportV2Service) {
        var vm = this;

        vm.isOffline = config.isOffline || false;

        vm.overview = overview;
        vm.compatibility = compatibility;
        vm.performance = performance;

        vm.types = compatibility.result_json2.types;
        vm.subtypes = vm.compatibility.resultSubtypes;

        //兼容性相关数据
        vm.compIndustryTop = vm.overview.industry_exception_top_map;
        vm.compIndustryAvg = vm.overview.industry_exception_avg_map;
        vm.compTaskAvg = vm.overview.task_exception_avg_map;

        //性能相关数据
        vm.perfIndustryTop = vm.performance.industry_performance_top;
        vm.perfIndustryAvg = vm.performance.industry_performance_avg;
        vm.perfTaskAvg = vm.performance.task_performance_avg;

        //测试终端数量相关数据
        vm.needOptimizeCount = vm.types.t_r_need_optimize.count;
        vm.exceptionCount = vm.types.t_r_exception.count;
        vm.testSuccessedCount = vm.types.t_r_success.count;
        vm.unTestedCount = vm.types.t_r_untested.count;
        vm.allDeviceCount = vm.compatibility.device_count
        vm.testedCount = vm.allDeviceCount - vm.unTestedCount;

        vm.passRate = ((vm.needOptimizeCount + vm.testSuccessedCount) == 0 || vm.testedCount == 0) ? 0 :
            (Math.round((vm.needOptimizeCount + vm.testSuccessedCount) / vm.testedCount * 10000) / 100).toFixed(2);

        $rootScope.appName = vm.compatibility.name + vm.compatibility.app_version;

        $scope.$on('toState', function(e, toState) {
            if (toState.name == "report_v2") {
                setTimeout(drawChart);
            };
        });

        $scope.$on('$stateChangeSuccess', function(e, toState, key, fromeState) {
            var reportLevel = $state.current.name.match(/\./g) || [];
            // /report默认路由是概况界面
            if (reportLevel.length == 0) {
                vm.childStateName = "概况";
            // /report.xxx 表示report下一级路由
            } else if(reportLevel.length == 1) {
                vm.childStateName = toState.title;
            }
        });
        //business不再从url中获取，report中根据app类型动态设置business
        config.setBusiness(vm.overview.test_app_type == 'app' ? 'app' : 'game');

        if (vm.overview.test_app_type == "game_heavy") {
            vm.testAppTypeText = "(重度游戏)";
        } else if (vm.overview.test_app_type == "game_light") {
            vm.testAppTypeText = "(轻度游戏)";
        }

        function drawChart() {
            var title = {},
                exceptionDevices = "未通过",
                successDevices = "通过",
                needOptimizeDevices = "待优化";

            if (vm.types.t_r_exception.count != 0) {
                title.count = vm.types.t_r_exception.count;
                title.name = exceptionDevices;
            } else if (vm.types.t_r_need_optimize.count != 0) {
                title.count = vm.types.t_r_need_optimize.count;
                title.name = needOptimizeDevices;
            } else {
                title.count = vm.types.t_r_success.count;
                title.name = successDevices;
            };

            $('#pie-chart').highcharts({
                chart: {
                    type: 'pie',
                    width: 190,
                    height: 190
                },
                title: {
                    text: '<span class="chart-count">' + title.count + '</span>',
                    verticalAlign: 'middle',
                    y: -10,
                    useHTML: true
                },
                subtitle: {
                    text: '<span class="chart-name">' + title.name + '</span>',
                    verticalAlign: 'middle',
                    useHTML: true
                },
                plotOptions: {
                    pie: {
                        innerSize: 110,
                        dataLabels: {
                            enabled: false
                        },
                        marker: {
                            states: {
                                hover: false
                            }
                        },
                        colors: ["#fa575f", "#46ab2c", "#fa8557"]
                    },
                    series: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function(e) {
                                    $(".chart-count").html(this.y);
                                    $(".chart-name").html(this.name);
                                }
                            }
                        }
                    }
                },
                tooltip: {
                    enabled: false
                },
                credits: {
                    enabled: false
                },
                exporting: {
                    enabled: false
                },
                series: [{
                    data: [
                        [exceptionDevices, vm.types.t_r_exception.count],
                        [successDevices, vm.types.t_r_success.count],
                        [needOptimizeDevices, vm.types.t_r_need_optimize.count]
                    ],
                    keys: ['name', 'y']
                }]
            });
        }

        vm.wordHelpText = {
            InstallFailure: "应用在某款手机上进行安装操作，但是没有安装成功。",
            bootFailure: "应用安装成功,但是无法启动,或者启动后马上自动退出。判断标准：启动后，检测应用画面是否可见。",
            crash: "在应用运行过程中,程序崩溃导致意外退出。判断标准：检测应用画面是否可见。",
            screenLagFrozen: "在应用运行过程中,应用不流畅,画面切换卡屏,主要原因是cpu或者内存占用过高,需要开发商进行优化。",
            frozenScreenLagFrozen: "手机系统无法正常运行, 不接受输入事件, 但是应用没有闪退, 应用触发了手机的系统级bug, 引起系统崩溃。 ",
            blackScreen: "应用无法正常运行,没有显示任何ui界面,但是手机系统正常运行。",
            dataException: "与服务器数据交互异常,但是链接未断开,通常是手机应用与服务器交互接口设计没有经过充分验证,导致异常数据在服务器与手机应用之间流窜。",
            uiException: "应用UI界面显示紊乱,通常原因是分辨率差异或者应用场景切换逻辑代码书写有误。",
            connectException: '与服务器的连接发生异常,可能是没有考虑到网络编程中的异常错误处理,或者由于服务器压力过大引发服务器崩溃。',
            other: "其他异常。",
            linkException: "与服务器交互链接发生异常,通常由开发人员造成,没有考虑到网络编程中的异常,或者由于服务器压力过大引发服务器崩溃。",
            programException: "应用运行时出现异常提示或现象。",
            dataTraffic: "应用运行过程中所消耗的网络流量,主要集中在应用与服务器交互过程中产生的网络消耗。",
            bootDelay: "对应用发起启动指令，到真正进入应用第一个界面所消耗的时间,反映了应用的加载速度,跟应用资源包大小有关。",
            cpuUtilization: "应用进程占用的CPU资源,cpu使用率过高,说明应用比较耗电,而且容易卡顿。",
            memUtilization: "应用进程所消耗的手机内存,内存占用高容易引起应用卡顿甚至闪退。",
            fileSize: "文件大小。",
            temperature: "通过android温度传感器获取的手机温度,跟手机cpu占用率成正比。",
            frameRate: "应用每一秒内刷新的帧数,反映了应用画面流畅程度。",
            textDiffException: "文本对比异常。",
            clickException: "控件或图像点击异常，找不到控件或图像。"
        }

        vm.shareReportUrl = function() {
            reportV2Service.getReportShareURL($stateParams.key).then(function(url) {
                window.prompt(" Ctrl+C 拷贝到粘贴板~ ", url);
            })
        }

        vm.exportReportAsExcel = function() {
            window.open(reportV2Service.getExcelExportURL($stateParams.key));
        }
    }

})();

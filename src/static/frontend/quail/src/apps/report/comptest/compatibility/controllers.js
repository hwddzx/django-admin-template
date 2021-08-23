(function() {
    angular.module('report_v2')
        .controller('reportCompatibilityCtrlV2', reportCompatibilityCtrl)
        .controller('locateControllerV2', locateController);

    function reportCompatibilityCtrl($scope, $uibModal, $translate, $state, compatibility, subtasks, config) {
        var vm = this,
            initPageSize = 5;
        vm.exceptionListSize = 6;
        vm.compatibility = compatibility;
        vm.subtypes = vm.compatibility.result_json2.subtypes;

        var textLevel = $translate.instant("高、中、低端手机"),
            textVendor = $translate.instant("品牌"),
            textOs = $translate.instant("系统版本"),
            textRam = $translate.instant("Internal storage"),
            textScreenSize = $translate.instant("屏幕尺寸"),
            textResolution = $translate.instant("Resolution"),
            textAll = $translate.instant("全部"),
            translateModel = {
                "黑屏&白屏": $translate.instant("黑屏&白屏"),
                "启动失败": $translate.instant("启动失败"),
                "闪退": $translate.instant("闪退"),
                "数据异常": $translate.instant("数据异常"),
                "卡死": $translate.instant("卡死"),
                "安装失败": $translate.instant("安装失败"),
                "链接异常": $translate.instant("链接异常"),
                "其他异常": $translate.instant("其他异常"),
                "程序异常": $translate.instant("程序异常"),
                "卡顿": $translate.instant("卡顿"),
                "UI异常": $translate.instant("UI异常"),
                "连接异常": $translate.instant("连接异常")
            };

        var _init = function() {
            //处理device_distributions数据，按需求顺序排序
            var deviceList = {
                "level": textLevel,
                "vendor": textVendor,
                "os": textOs,
                "ram": textRam,
                "screen_size": textScreenSize,
                "cpu": "CPU",
                "resolution": textResolution,
                "gpu": "GPU"
            };
            vm.device_distributions = [];
            vm.device_distributionsPageSizes = {};
            _.each(deviceList, function(value, key) {
                if (vm.compatibility.device_distributions[key]) {
                    vm.compatibility.device_distributions[key].key = key;
                    vm.compatibility.device_distributions[key].title = value;
                    vm.device_distributions.push(vm.compatibility.device_distributions[key]);
                    //每个分类初始化只显示5个数据
                    vm.device_distributionsPageSizes[key] = initPageSize;
                }
            });

            //统计每个分类中未显示数据中的手机总台数
            vm.num = {};
            _.each(vm.compatibility.device_distributions, function(value, key) {
                vm.num[key] = 0;
                for (var i = initPageSize; i < value.length; i++) {
                    vm.num[key] += value[i].types[3].count;
                }
            });

            vm.load = function(device_distribution, num) {
                if (num) {
                    vm.device_distributionsPageSizes[device_distribution.key] = num;
                } else {
                    vm.device_distributionsPageSizes[device_distribution.key] = device_distribution.length;
                }
            };

            vm.theTopOne = {
                count : 0
            };
            _.each(vm.compatibility.result_json2.subtypes, function(value) {
                if (value.count > vm.theTopOne.count) {
                    vm.theTopOne = value;
                }
            });
            //卡顿&卡死后端数据是两项需要合并比较
            if (vm.theTopOne.count <= (vm.subtypes.e_r_screen_lag.count + vm.subtypes.e_r_frozen_screen.count)) {
                vm.theTopOne = {
                    count: vm.subtypes.e_r_screen_lag.count + vm.subtypes.e_r_frozen_screen.count,
                    name: $translate.instant('卡顿&卡死')
                };
            }
        };

        vm.subtaskExceptionList = vm.compatibility.subtask_exception_list;
        vm.value = textAll;

        vm.searchTheTopName = function(device_distributions) {
            var theTopOne = {};

            //"types":{"1":{"count":1,"rate":0.333},"2":{"count":2,"rate":0.667},"3":{"count":0,"rate":0},"4":{"count":0,"rate":0}
            //3为问题手机
            theTopOne.types = {
                "3": {
                    "count": 0
                }
            };
            _.each(device_distributions, function(value) {
                if (value.types[3].count > theTopOne.types[3].count) {
                    theTopOne = value;
                }
            });
            return theTopOne.name;
        };

        vm.exceptionListLoad = function(listSize) {
            vm.exceptionListSize = listSize;
        }

        $scope.open = function(name, device_distribution, device_distributionKey) {
            if(device_distribution[device_distributionKey].types[3].count){
                openModal(name, device_distribution, device_distributionKey);
            }
        }

        openModal = function(name, device_distribution, device_distributionKey) {
            var exception = {};
            exception.list = [];

            exception.name = name;
            _.each(_.filter(subtasks.subtasks, {is_passed: false}), function(value) {
                //当为系统版本时 分类如Android4.1 但device_model数据里为Android4.1.2   需要截取前10位才能匹配
                if (device_distribution.title === textOs) {
                    value.device_model[device_distribution.key] = value.device_model[device_distribution.key].substr(0, 10);
                }

                //当为cpu时分类为Qualcomm 但device_model数据里为Qualcomm APQ8064需要截取空格前才能匹配
                if (device_distribution.title === 'CPU') {
                    var str = value.device_model[device_distribution.key];
                    str = str.split(' ');
                    value.device_model[device_distribution.key] = str[0];
                }

                //根据device_distributionKey筛选数据 "其他"一类用排除筛选
                //device_distribution ={"screen_size":[{"count":11,"rate":0.344,"name":"5.0","types":{..}},{"count":9..},{..}..],"resolution":[]}
                //devices.exception_list=[{"device_model":{screen_size": "5.0","level": "中端"..},"exception_scene": "", "key":".."..},{..}..]

                if (value.device_model[device_distribution.key] === device_distribution[device_distributionKey].name) {
                    exception.list.push(value);
                } else if (device_distribution[device_distributionKey].name === $translate.instant("Others")) {
                    for (var i = 0; i < device_distribution.length; i++) {
                        if (value.device_model[device_distribution.key] === device_distribution[i].name) {
                            return;
                        }
                    }
                    exception.list.push(value);
                }
            });


            $uibModal.open({
                templateUrl: 'apps/report/comptest/compatibility/locate.html',
                controller: 'locateControllerV2',
                controllerAs: "vm",
                size: "lg",
                resolve: {
                    exception: function() {
                        return exception
                    }
                }
            });
        };
        _init();
    }

    function locateController($scope, $state, $uibModalInstance, $stateParams, exception) {
        var vm = this;
        var initSize = 5;
        vm.exception = exception;
        vm.exceptionListSize = initSize;
        vm.taskKey = $stateParams.key;

        vm.cancel = function() {
            $uibModalInstance.close();
        };

        vm.loadExcpetionList = function() {
            vm.exceptionListSize += initSize;
        }
    }
})();

angular.module('control-panes')
    .controller('ControlPanesCtrl', ControlPanesController);

function ControlPanesController($rootScope, $scope, $state, $timeout, DialogService, DeviceDataService, RentModalService, CountDownService, StfService, RioService, rioDevice, TbMd5, config) {
    //’在线咨询窗口‘隐藏
    if(document.getElementById("lim_mini")){
        document.getElementById("lim_mini").style.display="none";
    }

    $scope.dtUrl = config.urls.dt;
    $scope.device = null;
    $scope.control = null;
    $scope.webSocketUrl = null;
    $scope.rioDevice = rioDevice;
    $rootScope.deviceType = window.localStorage.deviceType;
    $scope.hasRioDebug = _.includes(config.features, TbMd5.soar(config.features && config.features[0], "rio.debug"));

    //清理从report跳转过来时候，config中的device_name
    config.device_name = "";

    _init();

    $scope.stopRent = function(isForceStop, reason, preventStateGo, ignoreKick) {

        if (isForceStop) {
            _stopRent();
            return;
        }

        DialogService.confirm("是否确认要退出手机租用?").then(_stopRent);

        function _stopRent() {
            $scope.client.disconnect(ignoreKick);
            RioService.stopRent($scope.rioDevice.key, reason).then(function() {
                if (!preventStateGo) {
                    $state.go("devices", {}, {
                        reload: true
                    });
                }
            });
        }
    }

    $scope.showReletModal = function(isServerNotify) {
        var modalInstance = RentModalService.open(rioDevice);

        modalInstance.result.instance = modalInstance;
        modalInstance.result.then(_reletDevice, _stopRentDevice);

        function _reletDevice(data) {
            rioDevice.duration = (data.minutes || 0) * 60;
            RioService.rent(rioDevice, rioDevice.duration).then(_reloadState, _stopRentDevice);
        }

        function _stopRentDevice() {
            if (isServerNotify) {
                $scope.stopRent(true, "device_expire");
            }
        }

        function _reloadState() {
            //到期后再续租，直接刷新页面
            if (isServerNotify) {
                $state.reload();
                return;
            }

            //用户主动续租，则只更改倒计时时间
            if ($scope.countdown) {
                $scope.countdown.clear();
            }
            $scope.countdown = CountDownService.createInstance(rioDevice.remainTime);
            $scope.countdown.start();

        }

        return modalInstance.result;
    }

    function _init() {

        //如果是重新租用，则清除对应设备的缓存
        if ($scope.rioDevice.lastDuration) {
            DeviceDataService.clearCacheData(rioDevice.serial);
        }

        $scope.countdown = CountDownService.createInstance(rioDevice.remainTime);

        var client = $scope.client = StfService.createClient({
            scope: $scope,
            device: $scope.rioDevice,
            token: config.token,
            debugEnabled: true,
            maintainStfNotifyUrl: '/api/rio/stf/maintain/',
            maintainDeviceNotifyUrl: '/api/rio/device/maintain/',
            beforeUnload: function() {
                if (!$scope.expire) {
                    return "请点击“ 停止租用”， 否则退出页面后手机仍然在租用状态， 可以在设备列表之“ 我的设备” 里继续当前租用。";
                }
            }
        });

        client.watchs({
            'connect.done': function(data) {
                $scope.device = data.device;
                $scope.control = data.control;
                $scope.countdown.start();
                $scope.device.host = RioService.getCurrentRioDevice().host;
            },
            'connect.failed': function(reject) {
                $scope.stopRent(true, reject.code, true);
                DialogService.error(reject.msg).then(function() {
                    $state.go("devices", {}, {
                        reload: true
                    });
                });
            },
            //重连成功
            'reconnect.done': function() {},
            //重连失败
            'reconnect.failed': function(reason) {
                $scope.stopRent(true, reason);
            },
            //其他用户停止当前租用
            'device.stopRent': function() {
                DialogService.error("您已停止租用该设备!").then(function() {
                    $scope.stopRent(true, "other_kicked", false, true);
                });
            },
            //租用到期
            'device.expire': function() {
                $scope.expire = true;
                $scope.showReletModal(true);
                client.close();
            },
            //租用即将到期（5分钟）
            'device.willExpire': function() {
                var CONFIRM_EXPIRE_TIME = 10 * 1000,
                    reletPromise,
                    confirmPromise = DialogService.confirm({
                        message: "您的租用即将到期，是否续租？",
                        expireTimes: CONFIRM_EXPIRE_TIME
                    });

                confirmPromise.then(function() {
                    reletPromise = $scope.showReletModal();
                    reletPromise.finally(function() {
                        reletPromise.closed = true;
                    })
                }).finally(function() {
                    confirmPromise.closed = true;
                });
            },
            //闲置超时
            'device.idle': function() {},
            //离开设备控制页面
            "leave.stf.state": function(opts) {
                //退出租用时清除缓存
                if (client.state.isUnrent) {
                    DeviceDataService.clearCacheData();
                }
                if ($scope.device) {
                    client.close();
                }
                opts.removeListener();
            }
        });

    }




}

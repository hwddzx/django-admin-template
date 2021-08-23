(function() {
    angular.module('device-list')
        .filter('trustAsHtml', trustAsHtml)
        .filter('secondFilter', secondFilter)
        .filter('rioDeviceStatusValue', rioDeviceStatusValue)
        .filter('rioDeviceListStatusValue', rioDeviceListStatusValue)
        .filter('rioDeviceStatus', rioDeviceStatus)
        .filter('rioDeviceListStatus', rioDeviceListStatus);
    function trustAsHtml($sce) {
        return function(result) {
            return $sce.trustAsHtml(result);
        }
    }

    function secondFilter() {
        return function(second, isDisplaySecond, placeholder) {
            placeholder = placeholder || '-';
            if (!second) {
                return placeholder;
            }
            var time = '';
            if (second >= 3600) {
                time = Math.floor(second / 3600) + '小时';
                second = second % 3600;
            }
            if (second >= 60) {
                time += Math.floor(second / 60) + '分';
                second = second % 60;
            }
            if (second > 0 && isDisplaySecond) {
                time += second + '秒';
            }
            return time;
        };
    }

    function rioDeviceStatus(gettext, config) {
        var isProductionEnv = (config.releaseEnv === 'production');
        return function(device) {
            if (device.status == undefined) {
                return "离线";
            } else if (device.status == 3) {
                return isProductionEnv ? "租用中" : "离线";
            } else if (device.status != 0) {
                return "租用中"
            } else {
                if (!device.health){
                    return isProductionEnv ? "租用中" : "不健康";
                }else{
                    return "租用";
                }
            }
        }
    }

    function rioDeviceListStatus(gettext, config) {
        var isProductionEnv = (config.releaseEnv === 'production');
        return function(device) {
            if (device.status == undefined) {
                return "预约";
            } else if (device.status == 3) {
                return isProductionEnv ? "租用中" : "预约";
            } else if (device.status != 0) {
                return "租用中"
            } else {
                if (!device.health){
                    return isProductionEnv ? "租用中" : "不健康";
                }else{
                    return "租用";
                }
            }
        }
    }

    function rioDeviceStatusValue(gettext, config) {
        var isProductionEnv = (config.releaseEnv === 'production');
        return function(status) {
            if (status == undefined) {
                return "离线";
            } else if (status == 3) {
                return isProductionEnv ? "租用中" : "离线";
            } else if (status != 0) {
                return "租用中"
            } else {
                return isProductionEnv ? "租用中" : "空闲"
            }
        }
    }

    function rioDeviceListStatusValue(gettext, config) {
        var isProductionEnv = (config.releaseEnv === 'production');
        return function(status) {
            if (status == undefined) {
                return "预约";
            } else if (status == 3) {
                return isProductionEnv ? "租用中" : "预约";
            } else if (status != 0) {
                return "租用中"
            } else {
                return isProductionEnv ? "租用中" : "空闲"
            }
        }
    }

})();
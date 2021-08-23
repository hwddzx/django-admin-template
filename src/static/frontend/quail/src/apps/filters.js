(function() {
    angular.module('quail.main')
        .filter('actionTybe', actionTybe)
        .filter('dateFilter', dateFilter)
        .filter('secondFilter', secondFilter)
        .filter('ellipsisText', ellipsisText)
        .filter('transformPercent', transformPercent)
        .filter('executionResultTextColor', executionResultTextColor)
        .filter('executionResultBackgroundColor', executionResultBackgroundColor)
        .filter('executionResultStatus', executionResultStatus)
        .filter('taskStatus', taskStatus)
        .filter('priorityBackgroundColor', priorityBackgroundColor)
        .filter('trustAsHtml', trustAsHtml)
        .filter('qiniuThumbnail', qiniuThumbnail)
        .filter('excludeByKey', excludeByKey)
        .filter('arrayToString',arrayToString)
        .filter('actionIdConversionSnapshot', actionIdConversionSnapshot)
        .filter('scanStatusFilter', scanStatusFilter);

    function actionTybe() {
        return function(action) {
            var types = {
                "setText": "输入",
                "initVariable": "输出",
                "plugin-dev": "插件",
                "plugin-tc": "插件",
                "updateVariable": "条件控制",
                "custom_param": "自定义"
            };
            return types[action];
        };
    }

    function dateFilter($filter) {
        var dateFilter = $filter('date');
        return function(items, format) {
            format = format || 'yyyy-MM-dd HH:mm:ss';
            if (!items) {
                return "-";
            }
            return dateFilter(items * 1000, format);
        };
    }

    function secondFilter() {
        return function(second, isDisplaySecond, decimalLength, placeholder) {
            isDisplaySecond = isDisplaySecond || true;
            decimalLength = decimalLength || 0;
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
                time += second.toFixed(decimalLength) + '秒';
            }
            return time;
        };
    }

    function ellipsisText() {
        return function(filterText, maxLength, ellipsisText) {
            var str = filterText + "";
            if (str.length > maxLength) {
                if (ellipsisText) {
                    str = ellipsisText;
                } else {
                    str = str.substring(0, maxLength) + "...";
                }
            }
            return str;
        }
    }

    function transformPercent() {
        return function(numerator, denominator) {
            if (denominator == 0) {
                return "0.00%";
            } else {
                return (numerator / denominator * 100).toFixed(2) + "%";
            }
        }
    }

    function executionResultTextColor() {
        var resultMap = {
            "失败": { color: "#f6444d" },
            "阻塞": { color: "#ff7e00" },
            "失败|致命": { color: "#f6444d" },
            "失败|严重": { color: "#f6444d" },
            "失败|一般": { color: "#f6444d" },
            "失败|提示": { color: "#f6444d" },
            "通过": { color: "#27a907"}
        };
        return function(result) {
            if (resultMap[result]) {
                return resultMap[result].color;
            }
        }
    }

    function executionResultBackgroundColor() {
        var resultMap = {
            "失败": { color: "#fcf2f3" },
            "通过": { color: "#f4fcf2" },
            "失败|致命": { color: "#fcf2f3" },
            "失败|严重": { color: "#fcf2f3" },
            "失败|一般": { color: "#fcf2f3" },
            "失败|提示": { color: "#fcf2f3"}
        };
        return function(result) {
            if (resultMap[result]) {
                return resultMap[result].color;
            }
        }
    }

    function executionResultStatus() {
        var resultMap = {
            0: '排队中',
            1: '等待重测',
            3: '排队中',
            5: '执行中',
            10: '执行完成',
            20: '结果已上传'
        };
        return function(result) {
            return resultMap[result] || '排队中';
        }
    }

    function taskStatus() {
        var resultMap = {
            0: '执行中',
            10: '执行完成'
        };
        return function(result) {
            return resultMap[result] || '执行中';
        }
    }

    function priorityBackgroundColor() {
        var resultMap = {
            "高": { color: "#fa575f" },
            "中": { color: "#faac71" },
            "低": { color: "#accbf3" }
        };
        return function(result) {
            if (resultMap[result]) {
                return resultMap[result].color;
            }
        }
    }

    function trustAsHtml($sce){
        return function(result){
            return $sce.trustAsHtml(result);
        }
    }

    function qiniuThumbnail(config) {
        return function(url, size) {
            if (config.isLab()) return url;
            return url + "?imageView2/2/w/" + (size || 200);
        }
    }

    function excludeByKey() {
        return function(items, key) {
            return _.filter(items, function(item) {
                return item.key != key
            })
        }
    }

    function arrayToString() {
        return function(items) {
            return _(items || []).toString();
        }
    }
    function actionIdConversionSnapshot() {
        return function(action, host) {
            return _.URI.join(host, (action.resourceId || action.actionId) + ".jpg?imageView2/2/w/200");
        }
    }

    function scanStatusFilter() {
        var resultMap = {
            0: '扫描失败或终止',
            4: '排队中',
            5: '扫描中',
            10: '扫描完成'
        };
        return function(result) {
            return resultMap[result];
        }
    }
})();

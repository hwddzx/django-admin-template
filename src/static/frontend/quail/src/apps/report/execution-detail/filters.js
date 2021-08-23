(function() {
    angular.module('quail.report')
        .filter('subType', subType)
        .filter('compareResultTextColor', compareResultTextColor)
        .filter('tbCompareLimitTo', tbCompareLimitTo)
        .filter('pluginResult', pluginResult)
        .filter('pluginResultColor', pluginResultColor)
        .filter('logLevel', logLevel);

    function subType() {
        return function(items, param) {
            var exceptions = [];
            for (var i = items && items.length - 1; i >= 0; i--) {
                if (items[i].content.subType == param) {
                    exceptions.push(items[i]);
                }
            }
            return exceptions;
        };
    }

    function compareResultTextColor() {
        var resultMap = {
            "optimizable": { color: "#ff7e00" },
            "pass": { color: "#27a907" },
            "fail": { color: "#f6444d" }
        };
        return function(result) {
            if (resultMap[result]) {
                return resultMap[result].color;
            }
        }
    }

    function tbCompareLimitTo($filter) {
        // 在当前图片为第一张时，不能加载前一张，对此作留空白处理
        return function(items, currentNumber) {
            if (items.length) {
                if (currentNumber > 1) {
                    //当前图片放在中，从前一张截取
                    return $filter('limitTo')(items, '3', currentNumber - 2);
                } else {
                    var array = [];
                    array[1] = ($filter('limitTo')(items, '1', currentNumber - 1))[0];
                    if (items.length > 1) {
                        array[2] = ($filter('limitTo')(items, '1', currentNumber))[0];
                    }
                    return array;
                }
            }
        };
    }

    function pluginResult() {
        return function(result) {
            var text = {
                '0': '通过',
                '1': '失败',
                '-2': 'N/A'
            };
            return text[result];
        };
    }

    function pluginResultColor() {
        return function(result) {
            return result == 0 ? '#27a907' : '#f6444d';
        }
    }

    function logLevel(){
        return function(item){
            var level = "unknown";
            switch (item){
                case "F":
                    level = "FATAL";
                    break;
                case "E":
                    level = "ERROR";
                    break;
                case "W":
                    level = "WARN";
                    break;
                case "I":
                    level = "INFO";
                    break;
                case "D":
                    level = "DEBUG";
                    break;
            }
            return _.toLower(level);
        }
    }

})();

(function() {
    angular.module("report_v2")
        .filter("logLevel", logLevel)
        .filter("emptyReplace", emptyReplace)
        .filter("tbCompareLimitToV2", tbCompareLimitToV2)
        .filter("tbDeviceStatusText", tbDeviceStatusText);

    function emptyReplace() {
        return function(item, replaceStr) {
            if (_.isEmpty(item)) {
                return replaceStr || "-";
            }
            return item;
        }
    }

    function tbCompareLimitToV2($filter) {
        // 在当前图片为第一张时，不能加载前一张，对此作留空白处理
        return function(items, currentNumber) {
            if (items.length) {
                return items.slice(currentNumber - 1, currentNumber + 3);
            }
        };
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

    function tbDeviceStatusText() {
        return function (status) {
            var objStatus = {
                0: "空闲",
                1: "忙碌",
                3: "维护中",
                4: "回放中"
            }
            return objStatus[status];
        }
    }
})();

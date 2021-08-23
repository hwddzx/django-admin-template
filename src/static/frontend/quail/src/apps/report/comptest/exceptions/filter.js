//(function() {
//    angular.module('report_v2')
//        .filter('subType', subType)
//        .filter('tbCompareLimitTo', tbCompareLimitTo);
//
//    function subType() {
//        return function(items, param) {
//            var exceptions = [];
//            if (param == "All") {
//                return items;
//            } else {
//                for (var i = items.length - 1; i >= 0; i--) {
//                    if (items[i].content.subType == param) {
//                        exceptions.push(items[i]);
//                    };
//                };
//                return exceptions;
//            };
//        };
//    }
//
//    function tbCompareLimitTo($filter) {
//        // 在当前图片为第一张时，不能加载前一张，对此作留空白处理
//        return function(items, currentNumber) {
//            if (items.length) {
//                if (currentNumber > 1) {
//                    //当前图片放在中，从前一张截取,显示三张
//                    return items.slice(currentNumber - 2, currentNumber + 1);
//                } else {
//                    var array = [];
//                    array[1] = items[0];
//                    if (items.length > 1) {
//                        array[2] = items[1];
//                    }
//                    return array;
//                }
//            }
//        };
//    }
//
//})();

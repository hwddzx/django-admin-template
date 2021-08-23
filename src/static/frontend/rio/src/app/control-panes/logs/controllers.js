angular.module('stf.logs').controller('LogsCtrl', LogsCtrl);

function LogsCtrl($scope, $timeout, LogcatService) {

    $scope.started = LogcatService.started

    $scope.filters = {}

    $scope.filters.levelNumbers = LogcatService.filters.levelNumbers

    //日志级别默认为info
    $scope.filters.priority = LogcatService.filters.priority = $scope.filters.levelNumbers[1];

    LogcatService.filters.filterLines()

    $scope.$watch('started', function(newValue, oldValue) {
        if (newValue !== oldValue) {
            LogcatService.started = newValue
            if (newValue) {
                $scope.control.startLogcat(LogcatService.serverFilters).then(function() {})
            } else {
                $scope.control.stopLogcat()
            }
        }
    })

    $scope.restartLogcat = _.debounce(function() {
        if (LogcatService.started) {
            $timeout(function() {
                $scope.control.startLogcat(LogcatService.serverFilters);
            });
        }
    },300);

    $scope.logToggle = function() {
        $scope.started = !$scope.started;
    }

    //TODO 暂时注释掉，需要重新onbeforeunload方法，支持注册多个inload事件
    // window.onbeforeunload = function() {
    //     if ($scope.control) {
    //         $scope.control.stopLogcat()
    //     }
    // }

    $scope.clear = function() {
        LogcatService.clear()
    }

    function defineFilterWatchers(props) {
        angular.forEach(props, function(prop) {
            $scope.$watch('filters.' + prop, function(newValue, oldValue) {
                if (!angular.equals(newValue, oldValue)) {
                    LogcatService.filters[prop] = newValue
                }
            })
        })
    }

    defineFilterWatchers([
        'levelNumber',
        'message',
        'pid',
        'tid',
        'dateLabel',
        'date',
        'tag',
        'priority'
    ])
}

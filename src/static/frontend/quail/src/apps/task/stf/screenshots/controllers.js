angular.module('quail.screenshots').controller('ScreenshotsCtrl', ScreenshotsCtrl);


function ScreenshotsCtrl($rootScope, $scope, TaskService, SocketService, DialogService, spinner, $interval, ModalService) {

    var SINGLE_SHOT_DELAY = 10,
        MULTI_SHOT_DELAY = 1000;

    $scope.screenShotSize = 180
    $scope.capturePromise = null
    $scope.maxScreenshots = 50
    $scope.imageWidth = 300;

    _initImageBoxConfig();

    function _initImageBoxConfig() {
        if(!$scope.task)return;

        if ($scope.task.isScriptRecord) {
            $scope.imageBoxConfig = {
                templateUrl: 'apps/task/stf/templates/snapshot.area.html',
                margin: 140,
                offsetTop: 50
            }
        } else {
            $scope.imageBoxConfig = {
                templateUrl: 'apps/task/stf/templates/snapshot.box.html',
                margin: 100,
                offsetTop: 0
            }
        }
    }

    $scope.style = {
        width: 0
    };

    $scope.getSnapshotUrl = function(snapshot) {
       return snapshot.patch ? snapshot.patch.url : _getOriginUrl(snapshot);
    }

    $scope.setCurrentSnapshot = function(snapshot) {
        $scope.snapshot = snapshot;
    }

    $scope.snapshotFilter = function(item) {
        return !item.ignore;
    }

    $scope.reverseIndex = function(length, index){
        return length - index;
    }

    $scope.deleteSnapshotPatch = function(snapshot) {
        TaskService.deleteSnapshotPatch($scope.execution, snapshot).then(function() {
            delete snapshot.patch;
        });
    }

    $scope.deleteRecordAction = function(snapshot) {
        spinner.show();
        $scope.control.deleteRecordActions({executionKey: $scope.execution.key, actionIds: [_getActionId(snapshot)]})
            .then(function() {
                $scope.$apply(function() {
                    _.remove($scope.execution.snapshots, function(shot) {
                        return snapshot.body.name == shot.body.name;
                    });
                });
            }).catch(function(data) {
                DialogService.alert(data.message);
            }).finally(function() {
                spinner.hide();
            });
    }

    $scope.showSnapshot = function(snapshot) {
        $.fancybox(_getOriginUrl(snapshot));
    }

    $scope.updateSnapshot = function(model) {
        $scope.snapshot.areas = model.areas;
        $scope.snapshot.areasType = model.areasType;
    }

    $scope.toggleEditMode = function(editable) {
        $scope.editable = editable;
        //退出编辑模式后，重置截图的选中状态
        if (!editable) {
            angular.forEach($scope.execution.snapshots, function(snapshot) {
                snapshot.checked = false;
            });
        }
    }

    $scope.$watch("execution.snapshots", function(newVal, oldVal) {
        $scope.checkedSnapshots = _.filter(newVal, { checked: true });
    }, true);

    $scope.deleteSnapshots = function() {
        var snapshots = $scope.execution.snapshots,
            checkedSnapshots = $scope.checkedSnapshots,
            checkedFilenames = _.chain(checkedSnapshots).map("body").map("name").value();
        if (checkedSnapshots.length) {
            DialogService.confirm("您确定要删除截图吗？")
                .then(function() {
                    if ($scope.task.isScriptRecord) {
                        angular.forEach(checkedSnapshots, function(item) {
                            item.ignore = true;
                        });
                    } else {
                        $scope.control.deleteSnapshots({
                            serial: $scope.rioDevice.serial,
                            rentKey: $scope.rioDevice.rentKey,
                            executionKey: $scope.execution.key,
                            filenames: checkedFilenames
                        })
                        $scope.execution.snapshots = _.difference(snapshots, checkedSnapshots);
                    }
                });
        }
    }

    $scope.$on("screenshot", function() {
        if (!$scope.execution) {
            DialogService.alert("您还没有开始用例，请开始用例后再截图!");
            return;
        }
        if ($scope.task.isScriptRecord) {
            DialogService.alert("录制脚本不支持手动截图！");
            return;
        }
        $scope.takeScreenshot();
    })

    $scope.$on("device:apply", function() {
        SocketService.getSocket().on("gesture.capture", function(result) {
             var body = JSON.parse(result.body);
            // when user clicks on the invalid area, server will return 'undefined'
            // as captured image name instead of a real image name.
            if(body.name === 'undefined'){
                $scope.$broadcast('deviceControl:showInvalidAreaHint');
            }else{
                $scope.addScreenshot({
                    body: body
                });
            }
        });
    });

    $scope.shotSizeParameter = function(maxSize, multiplier) {
        var finalSize = $scope.screenShotSize * multiplier
        var finalMaxSize = maxSize * multiplier

        return (finalSize === finalMaxSize) ? '' :
            '?crop=' + finalSize + 'x'
    }

    $scope.takeScreenshot = function() {
        $scope.control.screenshot().then(function(result) {
            $scope.addScreenshot(result);
        })
    }

    $scope.addScreenshot = function(result) {
        if ($scope.execution) {
            if ($rootScope.spliceIndex) {  //表示恢复录制后从哪一步开始插入步骤
                $scope.$apply(function() {
                    $scope.execution.snapshots.splice($rootScope.spliceIndex, 0, result);
                })
            } else {
                $scope.$apply(function() {
                    $scope.execution.snapshots.unshift(result);
                })
            }
        }
    }

    function _getActionId(snapshot) {
        return snapshot.body.name.split('.')[0];
    }

    function _getOriginUrl(snapshot) {
        // android去stf版本(image属性)和ios(href属性)返回的截图是绝对路径的,老版android截图返回的相对路径(href属性)
        return snapshot.body.image || (/^http/.test(snapshot.body.href) ? snapshot.body.href : ($scope.device.host + snapshot.body.href));
    }
}

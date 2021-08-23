angular.module('device-control')
    .controller("ScreenControlCtrl", ScreenControlCtrl)
    .controller("DeviceControlSnapshotsCtrl", DeviceControlSnapshotsCtrl);

function ScreenControlCtrl($rootScope, $scope, ModalService, DialogService, spinner) {

    $scope.isScreenLocked = false;
    $scope.isPaused = false;
    $scope.isReplayed = false;

    $rootScope.spliceIndex = 0;

    //设备重连成功后，重设locked状态
    $scope.$on("reconnect:screen:socket", function() {
        $scope.isScreenLocked = false;
    });

    //清晰度范围:－5～5,默认值为0
    $scope.quality = 0;

    $scope.pause = function() {
        if (!$scope.isPaused) { //表示当前操作是暂停录制
            spinner.show();
            $scope.control.pause({executionKey: $scope.execution.key}).then(function() {
                $scope.isPaused = true;
                //将snapshots设置为可以删除，不同于删除patch
                _.forEach($scope.execution.snapshots, function(shot) {
                    shot.deleteStep = true;
                });
            }).catch(function(data) {
                DialogService.alert(data.message);
            }).finally(function() {
                spinner.hide();
            });
        } else {  //恢复录制
            var promise = null;
            if ($scope.execution.snapshots.length == 0) {
                promise = $scope.control.resume({executionKey: $scope.execution.key, actionId: null});
            } else {
                promise = _showSnapshots('resume').then(function(model) {
                    spinner.show();
                    $scope.selectedIndex = model.selectedIndex;
                    return $scope.control.resume({executionKey: $scope.execution.key, actionId: _getActionId(model.selectedSnapshot)});
                });
            }
            promise.then(function() {
                //恢复录制后不能删除snapshots
                _.forEach($scope.execution.snapshots, function(shot) {
                    shot.deleteStep = false;
                });
                $rootScope.spliceIndex = $scope.execution.snapshots.length - ($scope.selectedIndex + 1);
                $scope.isPaused = false;
            }).catch(function(data) {
                DialogService.alert(data.message);
            }).finally(function() {
                spinner.hide();
            });
        }
    }

    $scope.replayRecord = function() {
        if (!$scope.isReplayed) {  //选择步骤进行回放
            if ($scope.execution.snapshots.length == 0) {
                return DialogService.alert('还未录制步骤，无法回放！');
            } else {
                _showSnapshots('replay').then(function(model) {
                    return $scope.control.replayRecord({executionKey: $scope.execution.key, actionIds: model.selectedSnapshot});
                }).then(function() {
                    $scope.isReplayed = true;
                }).catch(function(data) {
                    DialogService.alert(data.message);
                });
            }
        } else {   //停止回放
            spinner.show();
            $scope.control.stopReplayRecord({executionKey: $scope.execution.key}).then(function() {
                $scope.isReplayed = false;
            }).catch(function(data) {
                DialogService.alert(data.message);
            }).finally(function() {
                spinner.hide();
            });
        }
    }

    $scope.$on("replayFinish", function() {
        $scope.isReplayed = false;
    })

    function _showSnapshots(handleType) {
        return ModalService.show({
            templateUrl: 'apps/task/stf/device-control/templates/device-control-snapshots.html',
            controller: 'DeviceControlSnapshotsCtrl',
            controllerAs: 'vm',
            size: 'hg',
            resolve: {
                snapshots: function () {
                    return $scope.execution.snapshots;
                },
                handleType: function () {
                    return handleType;
                }
            }
        });
    }

    function _getActionId(snapshot) {
        return snapshot.body.name.split('.')[0];
    }

    $scope.press = function(key) {
        $scope.control.keyPress($scope.isScreenLocked ? 'powerOn' : 'powerOff');
        $scope.isScreenLocked = !$scope.isScreenLocked;
    };

    $scope.onQualityChanged = _.debounce(function() {
        $rootScope.$broadcast("quality:changed", $scope.quality);
    }, 1000);

    $scope.screenshot = function() {
        $rootScope.$broadcast("screenshot");
    }
}

function DeviceControlSnapshotsCtrl($rootScope, $scope, $uibModalInstance, DialogService, snapshots, handleType) {
    var vm = this;
    vm.snapshots = _.reverse(_.cloneDeep(snapshots));
    vm.handleType = handleType;
    vm.selectedSnapshot = null;

    vm.clickSnapshot = clickSnapshot;
    vm.cancel = cancel;
    vm.close = close;

    _active();

    function _active() {
        _.forEach(vm.snapshots, function(snapshot) {
            snapshot.checked = false;
        });
    }

    function clickSnapshot(snapshot, index) {
        if (vm.handleType == 'resume') {  //恢复录制，单选
            if (snapshot.checked) {
                snapshot.checked = false;
                vm.selectedSnapshot = null;
            } else {
                _.forEach(vm.snapshots, function(shot) {
                    shot.checked = false;
                });
                snapshot.checked = true;
                vm.selectedSnapshot = snapshot;
                vm.selectedIndex = index;
            }
        } else {  //回放步骤，多选
            snapshot.checked = !snapshot.checked;
        }
    }

    function cancel() {
        $uibModalInstance.dismiss();
    }

    function close() {
        var model = null;
        if (vm.handleType == 'resume') {
            if (!vm.selectedSnapshot) {
                return DialogService.alert('请选择从哪一步后面继续录制');
            }
            model = {
                selectedSnapshot: vm.selectedSnapshot,
                selectedIndex: vm.selectedIndex
            };
        } else {
            var shots = [];
            _.forEach(vm.snapshots, function(snapshot) {
                if (snapshot.checked) {
                    shots.push(snapshot.body.name.split('.')[0]);
                }
            });
            if (shots.length == 0) {
                return DialogService.alert('请选择需要回放的步骤！');
            }
            model = {
                selectedSnapshot: shots
            };
        }
        $uibModalInstance.close(model);
    }
}

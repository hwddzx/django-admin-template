(function() {
    'use strict';

    angular.module('quail.report').controller('snapshotController', snapshotController);

    function snapshotController(ExecutionDetailService, ModalService) {

        var vm = this,
            currentIndex = 0, // 当前显示第一张截图的index
            moveImageCount = 1, // 点击前进或后退按钮替换的图片张数
            displayImageCount = 3;

        // 操作截图
        vm.preSnapshot = function() {
            vm.imagesLeftIn = true;
            if (currentIndex > 0) {
                currentIndex = Math.max(currentIndex - moveImageCount, 0);
                vm.currentImages = vm.images.slice(currentIndex, currentIndex + displayImageCount); // 取前三张截图
            } else {
                alert("已经到第一张图了!");
            }
        };
        vm.nextSnapshot = function() {
            vm.imagesLeftIn = false;
            if (currentIndex + moveImageCount < vm.images.length) {
                currentIndex = currentIndex + moveImageCount;
                vm.currentImages = vm.images.slice(currentIndex, currentIndex + displayImageCount); // 取后三张截图
            } else {
                alert("已经到最后一张图了!");
            }
        };

        vm.patchedSnapshots = function(executionId) {
            ExecutionDetailService.getPatchedSnapshots(executionId).then(function(data) {
                vm.images = data;
                vm.currentImages = vm.images.slice(0, displayImageCount);
                ModalService.show({
                    templateUrl: "apps/report/execution-detail/templates/patched.snapshot.modal.html",
                    windowClass: "patched-snapshot-modal",
                    resolve: {
                        model: vm
                    }

                })
            });
        };
    }
})();
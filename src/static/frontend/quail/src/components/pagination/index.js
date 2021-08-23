(function () {
    angular.module('quail.pagination', [])
        .directive('tbPagination', tbPagination);

    function tbPagination($timeout) {
        return {
            scope: {
                definePageSize: "=",
                list:"=",
                pageList: "=",
                currentPageNum: "="
            },
            templateUrl: "components/pagination/index.html",
            controllerAs: 'vm',
            bindToController: true,
            controller: function($scope) {
                var vm = this;
                vm.pageSizeList = [10, 20, 50, 100];
                vm.pageSize = vm.definePageSize || 50;
                vm.isHideNum = isHideNum;
                vm.changePageNum = changePageNum;
                vm.isShowNumBtn = isShowNumBtn;

                _initPageNumbers();
                $scope.$watch("vm.list", _initPageNumbers);
                $scope.$watch("vm.pageSize", _initPageNumbers);

                function changePageNum(pageNum) {
                    pageNum = parseInt(pageNum);
                    _.isNaN(pageNum) && (pageNum = vm.currentPageNum);
                    if (pageNum > vm.totalPageNum) pageNum = vm.totalPageNum;
                    if (pageNum < 1) pageNum = 1;
                    vm.number = vm.currentPageNum = pageNum;
                    vm.pageList = vm.list.slice(vm.pageSize * (pageNum - 1), vm.pageSize * pageNum);
                }

                function isShowNumBtn(pageNum) {
                    if (vm.currentPageNum > pageNum) {
                        return (vm.currentPageNum - pageNum) < 3;
                    } else if (vm.currentPageNum == pageNum) {
                        return true;
                    } else if (vm.currentPageNum < pageNum) {
                        return (pageNum - vm.currentPageNum) < 3;
                    }
                }

                function _initPageNumbers() {
                    if (!vm.list) return;
                    vm.totalPageNum = Math.ceil(vm.list.length / vm.pageSize);
                    vm.pageNumbers = Array.from({
                        length: vm.totalPageNum
                    }, function(val, key) {
                        return key;
                    });
                    $timeout(function() {
                        vm.changePageNum( vm.currentPageNum || 1);
                    });
                }

                function isHideNum(num) {
                    if (num == 1 || num == vm.totalPageNum) {
                        return false;
                    } else if (vm.currentPageNum < 3) {
                        return num > 5;
                    } else if (vm.currentPageNum > vm.totalPageNum - 2) {
                        return num < vm.totalPageNum - 4;
                    } else {
                        return num < vm.currentPageNum - 2 || num > vm.currentPageNum + 2;
                    }
                }
            }
        };
    }

})();
